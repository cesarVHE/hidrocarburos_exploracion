// Inicializar el mapa centrado en México
var map = L.map("map").setView([24.1, -102], 6);

// Capa base CartoDB Positron
var mapaBase = L.tileLayer("https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

// Paleta de colores alineada a la identidad institucional
var paletaColores = {
    "Provincias Petroleras": "#621132",  // Guinda intenso institucional
    "Aguas Profundas": "#4A1521",       // Guinda oscuro
    "Aguas Someras": "#731F31",        // Rojo quemado
    "Zona Burgos": "#A33244",          // Rojo institucional
    "Cuencas del Sureste": "#C2596A",  // Coral
    "Tampico - Misantla": "#BC955C",   // Dorado/Ocre
    "Zona Veracruz": "#987E50"         // Bronce/Ocre oscuro
};

// MIGRADAS: Rutas relativas locales para GitHub Pages (asumiendo que están en una carpeta llamada 'capas')
var urlsCapas = {
    "Provincias Petroleras": "provincias_petroleras.geojson",
    "Aguas Profundas": "Zona Aguas Profundas.geojson",
    "Aguas Someras": "Zona Aguas Someras.geojson",
    "Zona Burgos": "Zona Burgos.geojson",
    "Cuencas del Sureste": "Zona Cuencas del Sureste.geojson",
    "Tampico - Misantla": "Zona Tampico-Misantla.geojson",
    "Zona Veracruz": "Zona Veracruz.geojson",
    "Provincias petroleras": "provincias_petroleras.geojson"
};

var gruposCluster = {}; 
var capasCargadas = {};  

var controlCapas = L.control.layers({"Mapa Base": mapaBase}, {}, { collapsed: false }).addTo(map);

// Inicializar contenedores de cluster vacíos
for (var nombreCapa in urlsCapas) {
    if (urlsCapas.hasOwnProperty(nombreCapa)) {
        (function(colorCapaActual) {
            gruposCluster[nombreCapa] = L.markerClusterGroup({
                chunkedLoading: true,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: function(cluster) {
                    var totalPuntos = cluster.getChildCount();
                    return L.divIcon({
                        html: `<div style="background-color: ${colorCapaActual}cc; color: white; border: 2px solid #ffffff; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 3px 6px rgba(0,0,0,0.3); font-size: 11px;"><span>${totalPuntos}</span></div>`,
                        className: 'marker-cluster-custom',
                        iconSize: L.point(36, 36)
                    });
                }
            });
        })(paletaColores[nombreCapa]);
        
        controlCapas.addOverlay(gruposCluster[nombreCapa], nombreCapa);
        capasCargadas[nombreCapa] = false;
    }
}

// 1. ESTILO Y HOVER PARA CAPAS DE PUNTOS
function crearMarcadorCirculo(feature, latlng, nombreCapa) {
    var colorCapa = paletaColores[nombreCapa] || "#000000";
    var opcionesEstiloBase = {
        radius: 5.5,
        fillColor: colorCapa,
        color: "#ffffff",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.95
    };
    
    var marcador = L.circleMarker(latlng, opcionesEstiloBase);
    
    marcador.on('mouseover', function(e) {
        var layer = e.target;
        layer.setStyle({ radius: 8.5, weight: 2, color: "#000000" });
        var textoTooltip = feature.properties["Pozo"] || feature.properties["Campo"] || feature.properties["Nombre de la instalación"] || "Elemento";
        layer.bindTooltip(textoTooltip, { sticky: true, offset: [12, 0] }).openTooltip();
    });
    
    marcador.on('mouseout', function(e) {
        e.target.setStyle(opcionesEstiloBase);
    });

    inyectarPopUp(feature, marcador);
    return marcador;
}

// 2. ESTILO Y HOVER PARA CAPAS DE POLÍGONOS (Provincias Petroleras)
function aplicarEstiloPoligono(feature, layer, nombreCapa) {
    var colorCapa = paletaColores[nombreCapa] || "#000000";
    
    var estiloBase = {
        fillColor: colorCapa,
        fillOpacity: 0.3,
        color: colorCapa,
        weight: 2,
        opacity: 0.8
    };
    
    layer.setStyle(estiloBase);
    
    layer.on('mouseover', function(e) {
        var l = e.target;
        l.setStyle({
            fillOpacity: 0.5,
            weight: 3.5,
            color: "#000000"
        });
        
        var textoTooltip = feature.properties["provincia"] || feature.properties["nombre"] || "Provincia Petrolera";
        l.bindTooltip(textoTooltip, { sticky: true }).openTooltip();
    });
    
    layer.on('mouseout', function(e) {
        e.target.setStyle(estiloBase);
    });

    inyectarPopUp(feature, layer);
}

// Generar Pop-up con atributos
function inyectarPopUp(feature, layer) {
    if (feature.properties) {
        var contenido = "<div class='custom-popup'><strong>Detalles del Registro</strong><br><hr>";
        for (var propiedad in feature.properties) {
            if (feature.properties.hasOwnProperty(propiedad)) {
                var valor = feature.properties[propiedad];
                if (valor !== null && valor !== undefined) {
                    contenido += `<strong>${propiedad}:</strong> ${valor}<br>`;
                }
            }
        }
        contenido += "</div>";
        layer.bindPopup(contenido);
    }
}

// Descargar datos locales de forma asíncrona y bajo demanda
function descargarYMostrarCapa(nombre) {
    if (capasCargadas[nombre]) return; 
    
    console.log(`Cargando archivo local para: ${nombre}`);
    
    fetch(urlsCapas[nombre])
        .then(response => {
            if (!response.ok) {
                throw new Error(`No se pudo encontrar el archivo GeoJSON para '${nombre}'`);
            }
            return response.json();
        })
        .then(data => {
            var capaGeoJSON = L.geoJSON(data, {
                pointToLayer: function(feature, latlng) {
                    return crearMarcadorCirculo(feature, latlng, nombre);
                },
                onEachFeature: function(feature, layer) {
                    if (feature.geometry && feature.geometry.type !== "Point") {
                        aplicarEstiloPoligono(feature, layer, nombre);
                    }
                }
            });
            
            gruposCluster[nombre].addLayer(capaGeoJSON);
            capasCargadas[nombre] = true;
            console.log(`Capa '${nombre}' desplegada con éxito.`);
        })
        .catch(error => console.error(`Error al cargar la capa '${nombre}':`, error));
}

map.on('overlayadd', function(event) {
    descargarYMostrarCapa(event.name);
});