"""Corredores de 25 m: divisas angulares, extremos livres redondos e atributos intactos."""
from pathlib import Path
from collections import defaultdict, Counter
import json
import math
import sqlite3
import shutil
import time

import geopandas as gpd
import numpy as np
import shapely as s
from shapely.geometry import Point, Polygon, MultiPolygon, LineString, MultiPoint, box

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'favorabilidade_rede_trechos_original.gpkg'
DEST = ROOT / 'Favorabilidade Rede Trechos pol.gpkg'
WIDTH = 25.0
GRID = 0.0001


def polygonal(g):
    if g.is_empty:
        return Polygon()
    if g.geom_type in ('Polygon', 'MultiPolygon'):
        return g
    return s.union_all([p for p in s.get_parts(g) if p.geom_type in ('Polygon', 'MultiPolygon')], grid_size=GRID)


def clean(g):
    return s.set_precision(polygonal(s.make_valid(g)), GRID)


def halfplane(center, normal, bounds):
    """Half-plane represented beyond the full bounds; positive side belongs to A."""
    center = np.asarray(center, dtype=float)
    normal = np.asarray(normal, dtype=float)
    normal /= np.linalg.norm(normal)
    tangent = np.array([-normal[1], normal[0]])
    corners = np.array([[bounds[0], bounds[1]], [bounds[2], bounds[3]]])
    reach = 4 * max(np.linalg.norm(corners - center, axis=1).max(), 100)
    return Polygon([center-tangent*reach, center+tangent*reach,
                    center+tangent*reach+normal*reach, center-tangent*reach+normal*reach])


def components(g):
    return [g] if g.geom_type == 'Polygon' else list(s.get_parts(g))


def lateral_partition(overlap, axis):
    """Continuous shared-road split, without alternating sampled ownership."""
    oriented = []
    for line in s.get_parts(s.line_merge(axis)):
        oriented.append(s.reverse(line) if tuple(line.coords[0]) > tuple(line.coords[-1]) else line)
    axis = s.union_all(oriented)
    left = axis.buffer(WIDTH*6, single_sided=True, join_style='mitre')
    chosen = clean(overlap.intersection(left))
    if .05*overlap.area < chosen.area < .95*overlap.area:
        return chosen
    # More than two coincident routes: divide the remaining strip fairly.
    low, high = -WIDTH*5, WIDTH*5
    for _ in range(24):
        offset = (low+high)/2
        band = axis.buffer(offset, single_sided=True, join_style='mitre')
        mask = left.difference(band) if offset >= 0 else left.union(band)
        chosen = clean(overlap.intersection(mask))
        if chosen.area > overlap.area/2:
            low = offset
        else:
            high = offset
    return chosen


def sampled_partition(overlap, a, b, handle_shared=True):
    """Nearest-line partition away from junctions, using <=1m samples locally.

    Only the shared area is partitioned. Its complement is assigned to B,
    so discretization cannot introduce gaps or overlapping ownership.
    """
    if handle_shared:
        common = s.line_merge(s.intersection(a, b, grid_size=GRID))
        shared_parts = [p for p in s.get_parts(common) if p.geom_type == 'LineString' and p.length > GRID]
        if shared_parts:
            left, both = [], []
            for line in shared_parts:
                if tuple(line.coords[0]) > tuple(line.coords[-1]):
                    line = s.reverse(line)
                left.append(line.buffer(WIDTH*6, single_sided=True, join_style='mitre'))
                both.append(line.buffer(WIDTH*6, cap_style='flat', join_style='mitre'))
            region = clean(overlap.intersection(s.union_all(both)))
            remaining = clean(overlap.difference(region))
            chosen = clean(region.intersection(s.union_all(left)))
            if not remaining.is_empty and remaining.area > 1e-8:
                chosen = clean(s.union_all([chosen, sampled_partition(remaining, a, b, False)], grid_size=GRID))
            return chosen
    neighborhood = overlap.buffer(WIDTH*6)
    local = [s.intersection(x, neighborhood) for x in (a, b)]
    points, owners = [], []
    for owner, geom in enumerate(local):
        for part in s.get_parts(geom):
            if part.geom_type != 'LineString' or part.length == 0:
                continue
            step = max(1.0, part.length / 20000)
            ds = np.linspace(0, part.length, max(2, int(math.ceil(part.length / step)) + 1))
            coords = s.get_coordinates(s.line_interpolate_point(part, ds))
            points.extend(coords)
            owners.extend([owner] * len(coords))
    if not points or not all(owner in owners for owner in (0, 1)):
        raise RuntimeError('Sem amostras de ambos os trechos em uma sobreposicao.')
    unique, inverse = np.unique(np.round(points, 6), axis=0, return_inverse=True)
    membership = defaultdict(set)
    for sample, owner in zip(inverse, owners):
        membership[int(sample)].add(owner)
    cells = s.voronoi_polygons(MultiPoint(unique), extend_to=box(*overlap.bounds).buffer(100).envelope, ordered=True)
    selected = []
    for i, cell in enumerate(s.get_parts(cells)):
        if membership[i] == {0}:
            selected.append(cell)
        elif membership[i] == {0, 1}:
            # Partially coincident axes: retain both records on opposite sides.
            p = Point(unique[i])
            part = min(s.get_parts(a), key=lambda line: line.distance(p))
            distance = part.project(p)
            p0 = np.array(part.interpolate(max(0, distance - .5)).coords[0])
            p1 = np.array(part.interpolate(min(part.length, distance + .5)).coords[0])
            direction = p1-p0
            if np.linalg.norm(direction) > 1e-8:
                selected.append(cell.intersection(halfplane(unique[i], [-direction[1], direction[0]], cell.bounds)))
    return clean(overlap.intersection(s.union_all(selected)))


def build(lines):
    started = time.monotonic()
    nodes = defaultdict(list)
    parts = []
    for owner, geom in enumerate(lines):
        for line in s.get_parts(geom):
            coords = np.asarray(line.coords)[:, :2]
            parts.append((owner, line))
            for reverse in (False, True):
                oriented = coords[::-1] if reverse else coords
                point = oriented[0]
                following = next((p for p in oriented[1:] if np.linalg.norm(p-point) > 1e-7), None)
                if following is None:
                    raise RuntimeError('Parte linear sem comprimento.')
                direction = following-point
                direction /= np.linalg.norm(direction)
                nodes[tuple(np.round(point, 4))].append((owner, direction))
    # Detect endpoint-on-interior connections as well as endpoint-to-endpoint.
    tree = s.STRtree(lines)
    interior_connections = 0
    for coordinate, incident in nodes.items():
        p = Point(coordinate)
        known = {owner for owner, _ in incident}
        for other in tree.query(p, predicate='dwithin', distance=GRID):
            other = int(other)
            if other in known:
                continue
            for part in s.get_parts(lines[other]):
                if part.distance(p) > GRID:
                    continue
                d = part.project(p)
                if d <= GRID or part.length-d <= GRID:
                    continue
                for delta in (-.1, .1):
                    v = np.array(part.interpolate(max(0, min(part.length, d+delta))).coords[0])-coordinate
                    if np.linalg.norm(v) > 1e-7:
                        incident.append((other, v/np.linalg.norm(v)))
                interior_connections += 1
    pieces = [[] for _ in lines]
    free_ends = 0
    for owner, part in parts:
        pieces[owner].append(s.buffer(part, WIDTH, cap_style='flat', join_style='mitre', mitre_limit=5))
        for coordinate in (part.coords[0], part.coords[-1]):
            key = tuple(np.round(coordinate, 4))
            if len(nodes[key]) == 1:
                pieces[owner].append(Point(coordinate).buffer(WIDTH, quad_segs=24))
                free_ends += 1
    junctions = defaultdict(list)
    miter_patches = 0
    for coordinate, incident in nodes.items():
        if len(incident) < 2:
            continue
        # Same outgoing ray may represent overlapping road records; deduplicate rays.
        unique_directions = {}
        for owner, direction in incident:
            unique_directions[tuple(np.round(direction, 10))] = direction
        directions = sorted(unique_directions.values(), key=lambda u: math.atan2(u[1], u[0]))
        if len(directions) >= 2:
            for k, u in enumerate(directions):
                v = directions[(k+1) % len(directions)]
                gap = (math.atan2(v[1], v[0])-math.atan2(u[1], u[0])) % (2*math.pi)
                if gap <= math.pi+1e-8:
                    continue
                origin = np.array(coordinate)
                p = origin + WIDTH*np.array([-u[1], u[0]])
                q = origin + WIDTH*np.array([v[1], -v[0]])
                determinant = u[0]*v[1]-u[1]*v[0]
                if abs(determinant) < 1e-10:
                    continue
                distance = ((q-p)[0]*v[1]-(q-p)[1]*v[0])/determinant
                miter = p+distance*u
                # Bevel extremely acute joins instead of unbounded spikes.
                corners = [origin, p, miter, q] if np.linalg.norm(miter-origin) <= WIDTH*5 else [origin, p, q]
                patch = clean(Polygon(corners))
                for owner in {x[0] for x in incident}:
                    pieces[owner].append(patch)
                miter_patches += 1
        for owner, direction in incident:
            for other, other_direction in incident:
                if owner < other:
                    junctions[(owner, other)].append((np.array(coordinate), direction, other_direction))
    polygons = np.array([clean(s.union_all(p, grid_size=GRID)) for p in pieces], dtype=object)
    reference = s.union_all(polygons, grid_size=GRID)
    pairs = s.STRtree(polygons).query(polygons, predicate='intersects')
    pairs = pairs[:, pairs[0] < pairs[1]].T
    stats = Counter()
    print(f'Corredores: {len(polygons)}; pares: {len(pairs)}; extremos livres: {free_ends}; juncoes interiores: {interior_connections}', flush=True)
    for index, (i, j) in enumerate(pairs):
        if index % 100 == 0:
            print(f'Par atual {index}: {i}, {j}', flush=True)
        overlap = clean(s.intersection(polygons[i], polygons[j], grid_size=GRID))
        if overlap.is_empty or overlap.area < 1e-8:
            continue
        allocated = []
        shared_axis = s.intersection(lines[i], lines[j], grid_size=GRID).length > .01
        for component in components(overlap):
            if component.is_empty or component.area < 1e-8:
                continue
            options = junctions.get((int(i), int(j)), [])
            # Limit the straight junction cut to the neighborhood of that node.
            valid = [(p, u, v) for p, u, v in options
                     if component.distance(Point(p)) < WIDTH*5 and np.linalg.norm(u-v) > 1e-6]
            if shared_axis:
                allocated.append(lateral_partition(component, lines[i]))
                stats['particoes_eixos_parcialmente_coincidentes'] += 1
            elif valid:
                p, u, v = min(valid, key=lambda item: component.representative_point().distance(Point(item[0])))
                allocated.append(clean(component.intersection(halfplane(p, u-v, component.bounds))))
                stats['divisas_angulares'] += 1
            else:
                allocated.append(sampled_partition(component, lines[i], lines[j]))
                stats['particoes_fora_dos_nos'] += 1
        owned_a = clean(s.union_all(allocated, grid_size=GRID))
        owned_b = clean(s.difference(overlap, owned_a, grid_size=GRID))
        polygons[i] = clean(s.difference(polygons[i], owned_b, grid_size=GRID))
        polygons[j] = clean(s.difference(polygons[j], owned_a, grid_size=GRID))
        if index % 250 == 0:
            print(f'Particoes {index}/{len(pairs)} ({time.monotonic()-started:.1f}s)', flush=True)
    return polygons, reference, dict(stats, extremos_livres=free_ends, encontros_interiores=interior_connections, ajustes_cantos=miter_patches)


def main():
    frame = gpd.read_file(SOURCE, fid_as_index=True)
    geometries = s.set_precision(s.force_2d(frame.geometry.values), GRID)
    # Topological duplicates also include reversed orientation and redundant vertices.
    representatives, mapping, by_key = [], [], {}
    for geom in geometries:
        key = s.to_wkb(s.normalize(s.simplify(geom, 0)))
        if key not in by_key:
            by_key[key] = len(representatives)
            representatives.append(geom)
        mapping.append(by_key[key])
    lines = np.array(representatives, dtype=object)
    print(f'Entrada: {len(frame)} registros; eixos distintos: {len(lines)}', flush=True)
    import sys
    if '--resume' in sys.argv:
        polygons = s.from_wkb(np.load(ROOT/'poligonos_unicos_wkb.npy', allow_pickle=True))
        reference = s.from_wkb((ROOT/'corredor_referencia.wkb').read_bytes())
        stats = json.loads((ROOT/'estatisticas_construcao.json').read_text(encoding='utf-8'))
    else:
        polygons, reference, stats = build(lines)
    polygons, reference = repair_coverage(polygons, reference)
    np.save(ROOT/'poligonos_unicos_wkb.npy', s.to_wkb(polygons), allow_pickle=True)
    (ROOT/'corredor_referencia.wkb').write_bytes(s.to_wkb(reference))
    np.save(ROOT/'mapa_registros.npy', mapping)
    (ROOT/'estatisticas_construcao.json').write_text(json.dumps(stats, indent=2), encoding='utf-8')
    validate_and_write(frame, polygons, reference, mapping, stats)


def repair_coverage(polygons, reference):
    """Remove numerical overlay slivers against the exact common corridor."""
    polygons = s.set_precision(polygons, 0)
    reference = s.set_precision(reference, 0)
    for attempt in range(3):
        extra = polygonal(s.union_all(polygons).difference(reference))
        extra_parts = components(extra)
        extra_tree = s.STRtree(extra_parts)
        for i, p in enumerate(polygons):
            hits = extra_tree.query(p, predicate='intersects')
            if len(hits):
                polygons[i] = polygonal(s.make_valid(p.difference(s.union_all([extra_parts[j] for j in hits]))))
        pairs = s.STRtree(polygons).query(polygons, predicate='intersects')
        for i, j in pairs[:, pairs[0] < pairs[1]].T:
            if polygons[i].intersection(polygons[j]).area > 1e-10:
                polygons[j] = polygonal(s.make_valid(polygons[j].difference(polygons[i])))
        missing = polygonal(reference.difference(s.union_all(polygons)))
        print(f'Ajuste numerico {attempt+1}: lacuna {missing.area:.10f} m2', flush=True)
        if missing.area < 1e-7:
            break
        tree = s.STRtree(polygons)
        additions = defaultdict(list)
        for part in components(missing):
            if part.is_empty:
                continue
            owner = int(tree.nearest(part.representative_point()))
            additions[owner].append(part)
        for owner, added in additions.items():
            polygons[owner] = polygonal(s.make_valid(s.union_all([polygons[owner], *added])))
    return polygons, reference


def validate_and_write(frame, polygons, reference, mapping, stats):
    assert all(s.is_valid(polygons)), 'Poligono invalido'
    assert not any(s.is_empty(polygons)), 'Trecho ficou sem poligono'
    pairs = s.STRtree(polygons).query(polygons, predicate='intersects')
    pairs = pairs[:, pairs[0] < pairs[1]]
    areas = s.area(s.intersection(polygons[pairs[0]], polygons[pairs[1]]))
    maximum = float(areas.max(initial=0))
    total = float(areas.sum())
    merged = s.union_all(polygons)
    missing = s.difference(reference, merged).area
    extra = s.difference(merged, reference).area
    print(f'Validacao: sobreposicao max={maximum:.8f}m2, total={total:.8f}m2, lacunas={missing:.8f}m2, extra={extra:.8f}m2', flush=True)
    assert maximum < .001 and total < .01, 'Sobreposicao residual'
    # Noding long edges at large projected coordinates leaves submillimetric
    # exterior slivers. Check their distance, not statewide accumulated area.
    outside_tolerance = merged.difference(reference.buffer(.001)).area if extra >= .1 else 0.0
    assert missing < .1 and outside_tolerance < .001, 'Cobertura alterada alem da tolerancia de 1 mm'
    result = frame.copy()
    result.geometry = [MultiPolygon([polygons[i]]) if polygons[i].geom_type == 'Polygon' else polygons[i] for i in mapping]
    stage = ROOT/'geometrias_temporarias.gpkg'
    result.to_file(stage, layer='subtrechos', driver='GPKG', index=True)
    # Clone source: preserve every original SQL column, value, FID and its type.
    shutil.copy2(SOURCE, DEST)
    with sqlite3.connect(DEST) as db:
        db.execute('ATTACH DATABASE ? AS generated', (str(stage),))
        table, geom_column = db.execute('SELECT table_name,column_name FROM gpkg_geometry_columns').fetchone()
        stage_column = db.execute('SELECT column_name FROM generated.gpkg_geometry_columns').fetchone()[0]
        pk = next(row[1] for row in db.execute(f'PRAGMA table_info("{table}")') if row[5])
        triggers = db.execute("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name=?", (table,)).fetchall()
        for name, sql in triggers:
            db.execute(f'DROP TRIGGER "{name}"')
        indices = db.execute("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL", (table,)).fetchall()
        definition = db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()[0]
        definition = definition.replace(f'"{table}"', '"poligonos_novos"', 1).replace(f'"{geom_column}" MULTILINESTRING', f'"{geom_column}" MULTIPOLYGON')
        db.execute(definition)
        db.execute(f'INSERT INTO poligonos_novos SELECT * FROM "{table}"')
        db.execute(f'DROP TABLE "{table}"')
        db.execute(f'ALTER TABLE poligonos_novos RENAME TO "{table}"')
        for (sql,) in indices:
            db.execute(sql)
        db.execute(f'UPDATE "{table}" SET "{geom_column}"=(SELECT "{stage_column}" FROM generated."{table}" AS g WHERE g."{pk}"="{table}"."{pk}")')
        rtree = f'rtree_{table}_{geom_column}'
        db.execute(f'DELETE FROM "{rtree}"')
        db.executemany(f'INSERT INTO "{rtree}" VALUES (?,?,?,?,?)', [(int(fid), g.bounds[0], g.bounds[2], g.bounds[1], g.bounds[3]) for fid, g in result.geometry.items()])
        for name, sql in triggers:
            db.execute(sql)
        db.execute("UPDATE gpkg_geometry_columns SET geometry_type_name='MULTIPOLYGON',z=0,m=0")
        bounds = result.total_bounds
        db.execute("UPDATE gpkg_contents SET min_x=?,min_y=?,max_x=?,max_y=?,last_change=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE table_name=?", (*bounds, table))
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    with sqlite3.connect(SOURCE) as original, sqlite3.connect(DEST) as output:
        fields = [row[1] for row in original.execute(f'PRAGMA table_info("{table}")') if row[1] != geom_column]
        select = ','.join('"'+c+'"' for c in fields)
        assert original.execute(f'SELECT {select} FROM "{table}" ORDER BY "{pk}"').fetchall() == output.execute(f'SELECT {select} FROM "{table}" ORDER BY "{pk}"').fetchall(), 'Atributos alterados'
        assert [r for r in original.execute(f'PRAGMA table_info("{table}")') if r[1] != geom_column] == [r for r in output.execute(f'PRAGMA table_info("{table}")') if r[1] != geom_column], 'Esquema dos atributos alterado'
    reopened = gpd.read_file(DEST, fid_as_index=True)
    assert len(reopened) == len(frame) and reopened.is_valid.all() and not reopened.is_empty.any()
    report = dict(stats, registros=len(frame), geometrias_distintas=len(polygons), duplicatas_preservadas=len(frame)-len(polygons),
                  distancia_por_lado_m=WIDTH, crs=str(frame.crs), sobreposicao_max_m2=maximum, sobreposicao_total_m2=total,
                  lacunas_m2=missing, excesso_m2=extra, excesso_alem_1mm_m2=outside_tolerance, atributos_identicos=True, geometria_valida=True,
                  grade_precisao_m=GRID, amostragem_particao_fora_juncoes_m=1, saida=DEST.name)
    (ROOT/'validacao.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)


if __name__ == '__main__':
    main()
