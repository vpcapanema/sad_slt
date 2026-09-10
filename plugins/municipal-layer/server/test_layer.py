import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
import geopandas as gpd
import numpy as np
from app import catalog, connection, export_layer, layer, selection

class LayerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = catalog()

    def test_catalog_integrity(self):
        self.assertEqual(len(self.items),6347)
        with connection() as conn:
            self.assertEqual(conn.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(conn.execute('PRAGMA foreign_key_check').fetchall(),[])
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM (SELECT attribute_id FROM observations GROUP BY attribute_id HAVING COUNT(*)<>645)').fetchone()[0],0)
        self.assertTrue(all(a['year']==2010 for a in self.items if a['field'].startswith('idh_')))
        self.assertEqual({a['year'] for a in self.items if a['source']=='Seade · IPDM'},{2014,2016,2018,2020,2022,2024})

    def test_mixed_sources_periods_roundtrip(self):
        chosen = [next(a for a in self.items if a['field']==field) for field in
                  ['idh_idhm_2010','seade_ipdm_2022','seade_ipdm_2024','populacao_V01000001_2022']]
        chosen += [next(a for a in self.items if a['coverage']==0), next(a for a in self.items if 0<a['coverage']<645)]
        ids=[a['id'] for a in chosen]
        expected=layer(selection(ids)).set_index('CD_MUN').sort_index()
        self.assertAlmostEqual(expected.loc['3550308','seade_ipdm_2022'],.577)
        for fmt in ['fgb','gpkg','shp']:
            with self.subTest(format=fmt),tempfile.TemporaryDirectory() as temp:
                with zipfile.ZipFile(io.BytesIO(export_layer({'attributes':ids,'format':fmt}))) as archive:
                    archive.extractall(temp)
                manifest=json.loads((Path(temp)/'metadados.json').read_text(encoding='utf-8'))
                actual=gpd.read_file(Path(temp)/f'municipios_sp.{fmt}').set_index('CD_MUN').sort_index()
                self.assertEqual(len(actual),645)
                self.assertEqual(actual.crs.to_epsg(),4674)
                self.assertTrue(actual.geometry.is_valid.all())
                self.assertTrue(actual.geometry.geom_equals(expected.geometry).all())
                for attr in manifest['attributes']:
                    np.testing.assert_allclose(actual[attr['export_field']],expected[attr['field']],equal_nan=True,rtol=1e-12)

    def test_invalid_requests(self):
        for ids in [[],['unknown'],[self.items[0]['id']]*2,None]:
            with self.assertRaises(ValueError):selection(ids)
        with self.assertRaises(ValueError):export_layer({'attributes':[a['id'] for a in self.items[:251]],'format':'shp'})
        with self.assertRaises(ValueError):export_layer({'attributes':[self.items[0]['id']],'format':'exe'})

    def test_full_catalog_export(self):
        items=selection([a['id'] for a in self.items])
        expected=layer(items).drop(columns='geometry').set_index('CD_MUN').sort_index()
        with tempfile.TemporaryDirectory() as temp:
            with zipfile.ZipFile(io.BytesIO(export_layer({'attributes':[a['id'] for a in items],'format':'fgb'}))) as archive:
                archive.extractall(temp)
            actual=gpd.read_file(Path(temp)/'municipios_sp.fgb',ignore_geometry=True).set_index('CD_MUN').sort_index()
            self.assertEqual(actual.shape,(645,6350))
            np.testing.assert_allclose(actual[[a['field'] for a in items]],expected[[a['field'] for a in items]],equal_nan=True)
        self.assertEqual(next(a['unit'] for a in self.items if a['field']=='economia_pib_mil_reais_2022'),'R$ × 1000')

if __name__=='__main__':unittest.main()
