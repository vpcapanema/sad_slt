# Contrato visual de ícones de arquivos — SICARD

## Regras obrigatórias

- Modelo: folha com canto dobrado, linhas e faixa frontal, conforme `icones_arquivos.png` fornecido pelo usuário. A geometria do desenho é compartilhada; somente a extensão e sua cor variam.
- Texto interno: extensão em caixa alta, sem ponto. Nomes, aliases, fonte, tipo geométrico e estado de seleção não alteram a cor.
- Uma extensão sempre usa a mesma cor, em qualquer pasta, modo de visualização ou sessão.
- Fonte única executável: `assets/js/file-icons.js`, API `SLTFileIcons.render(extensao)`. Novas interfaces que exibam arquivos devem reutilizar esse componente.
- GeoPackage (`GPKG`) é a exceção: usar exclusivamente `assets/img/file-types/geopackage.png`, cópia integral de `geopackage_icon.png` fornecido pelo usuário. Não recolorir nem adicionar faixa de extensão.
- PostGIS e SFTPGo identificam apenas os três repositórios da raiz do explorador. Nos demais níveis, pastas usam o ícone normal de pasta.
- Extensões não cadastradas usam sempre `#485865`; arquivos sem extensão exibem `ARQ`. Cadastrar novas cores somente no registro central e atualizar este contrato. Não gerar cores aleatórias, locais ou dependentes da ordem dos arquivos.
- Cores existentes não devem ser alteradas sem autorização do usuário.

## Cores por extensão

| Extensão | Cor |
|---|---|
| GEOJSON | `#16A085` |
| JSON | `#8E44AD` |
| SHP | `#28699C` |
| SHX | `#347CAF` |
| DBF | `#487985` |
| PRJ | `#687B8C` |
| CPG | `#748E99` |
| FGB | `#0097A7` |
| KML | `#E53935` |
| KMZ | `#C62828` |
| TIF | `#F2B321` |
| TIFF | `#D99A17` |
| IMG | `#E67E22` |
| ZIP | `#485865` |
| 7Z | `#596B7A` |
| RAR | `#9B59B6` |
| TAR | `#7D6E63` |
| GZ | `#6C7A89` |
| CSV | `#27AE60` |
| XLS | `#217346` |
| XLSX | `#185C37` |
| PDF | `#E91E63` |
| TXT | `#607D8B` |
| XML | `#795548` |
| PNG | `#26A69A` |
| JPG | `#EF6C00` |
| JPEG | `#E65100` |
| WEBP | `#00897B` |
| SVG | `#673AB7` |
| GDB | `#3F51B5` |
| SQL | `#455A64` |
| GPKG | Imagem própria, cores originais |

## Integração atual

Explorador de camadas: detalhes, listas e ícones grandes utilizam o mesmo componente. A extensão é normalizada antes de consultar o registro; `shp`, `.shp` e `SHP` produzem a mesma identidade visual.
