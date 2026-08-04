<?xml version="1.0" encoding="UTF-8"?><sld:StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:sld="http://www.opengis.net/sld" xmlns:gml="http://www.opengis.net/gml" xmlns:ogc="http://www.opengis.net/ogc" version="1.0.0">
    <sld:NamedLayer>
        <sld:Name>InventarioFlorestal2001</sld:Name>
        <sld:UserStyle>
            <sld:Name>STI_WMS_inventflore2001</sld:Name>
            <sld:IsDefault>1</sld:IsDefault>
            <sld:FeatureTypeStyle>
                <sld:Name>name</sld:Name>
                <sld:Rule>
                    <sld:Name>Floresta Ombrófila Densa</sld:Name>
                    <sld:Title>Floresta Ombrófila Densa</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Floresta Ombrófila Densa</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#0a630e</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Vegetação Secundária da Floresta Ombrófila Densa</sld:Name>
                    <sld:Title>Vegetação Secundária da Floresta \n Ombrófila Densa</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Vegetação Secundária da Floresta Ombrófila Densa</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#498c45</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Floresta Ombrófila Mista</sld:Name>
                    <sld:Title>Floresta Ombrófila Mista</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Floresta Ombrófila Mista</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#3bcc34</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Vegetação Secundária da Floresta Ombrófila Mista</sld:Name>
                    <sld:Title>Vegetação Secundária da Floresta \n Ombrófila Mista</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Vegetação Secundária da Floresta Ombrófila Mista</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#a4deaa</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Floresta Estacional Semidecidual</sld:Name>
                    <sld:Title>Floresta Estacional Semidecidual</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Floresta Estacional Semidecidual</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#adbf65</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Vegetação Secundária da Floresta Estacional Semidecidual</sld:Name>
                    <sld:Title>Vegetação Secundária da Floresta \n Estacional Semidecidual</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Vegetação Secundária da Floresta Estacional Semidecidual</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#eee188</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Formação Arbórea / Arbustiva-herbácea de Terrenos Marinhos Lodosos</sld:Name>
                    <sld:Title>Formação Arbórea / Arbustiva-herbácea de \n Terrenos Marinhos Lodosos</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Formação Arbórea / Abustiva-herbácea de Terrenos Marinhos Lodosos</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#082ad9</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Formação Arbórea / Arbustiva-herbácea em Região de Várzea</sld:Name>
                    <sld:Title>Formação Arbórea / Arbustiva-herbácea em \n Região de Várzea</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Formação Arbórea / Arbustiva-herbácea em Região de Várzea</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#417dd2</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Formação Arbórea / Arbustiva-herbácea sobre Sedimentos Marinhos Recentes</sld:Name>
                    <sld:Title>Formação Arbórea / Arbustiva-herbácea sobre \n Sedimentos Marinhos Recentes</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Formação Arbórea / Arbustiva-herbácea sobre Sedimentos Marinhos Recentes</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#33e4ea</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Savana</sld:Name>
                    <sld:Title>Savana</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Savana</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#8a80d2</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
                <sld:Rule>
                    <sld:Name>Savana Florestada</sld:Name>
                    <sld:Title>Savana Florestada</sld:Title>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo>
                            <ogc:PropertyName>DFITFS</ogc:PropertyName>
                            <ogc:Literal>Savana Florestada</ogc:Literal>
                        </ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <sld:PolygonSymbolizer>
                        <sld:Fill>
                            <sld:CssParameter name="fill">#e07dda</sld:CssParameter>
                        </sld:Fill>
                    </sld:PolygonSymbolizer>
                </sld:Rule>
            </sld:FeatureTypeStyle>
        </sld:UserStyle>
    </sld:NamedLayer>
</sld:StyledLayerDescriptor>

