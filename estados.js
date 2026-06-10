// --- Botón personalizado para centrar el mapa (Home) ---
// function agregarBotonCentrarMapa() {
//     if (!window.L || !mapas || !mapas[0]) return;
//     var homeControl = L.Control.extend({
//         options: { position: 'topleft' },
//         onAdd: function (map) {
//             var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-custom');
//             container.title = 'Centrar mapa';
//             container.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="12" x2="16" y2="12"/></svg>';
//             container.style.cursor = 'pointer';
//             container.onclick = function () {
//                 // Ajusta los valores a la vista inicial de tu mapa
//                 map.setView([23.6345, -102.5528], 5); // México
//             };
//             return container;
//         }
//     });
//     mapas[0].addControl(new homeControl());
// }
//Campos Visbles de los popup*@

//



//Busqueda
var availableTerms = [];//Variable global para almacenar los terminos de búqueda Sugerencia de Terminos
var datosExpendios = []; // variable global para almacenar todos los expendios de Petrolíferos
var camposVisiblesGlobal = [];
var datosExpendiosAcumulados = [];
let tpet = 0;
let tglp = 0;
let tgn = 0;
let te = 0;
var tpetg = [];
var tglpg = [];
var tgng = [];
let teg = [];

var rasterBaseLayers = {};

// Crea los Iconos y Define su tamaño
var iconoBase = L.Icon.extend({
    options: {
        iconSize: [36, 36],
        iconAnchor: [18, 16],
        popupAnchor: [0, -26]
    }
});

// Asignación de Iconos
//var iconoSolicitudes = new iconoBase({ iconUrl: 'https://cdn.sassoapps.com/img_snier/vistas/Solicitudes.png' });
//iconoAprobado = new iconoBase({ iconUrl: 'https://cdn.sassoapps.com/img_snier/vistas/Aprobado.png' });
//iconoNoaprobado = new iconoBase({ iconUrl: 'https://cdn.sassoapps.com/img_snier/vistas/NoAprobado.png' });


var currentMarker = null; // Referencia al marcador actual
// var seleccionado = 'estado'; // Estado inicial
var municipiosFiltrados = null;



//Colores
var initialStyle = {
    color: '#222', // Color de línea (negro/gris oscuro)
    fillColor: '#222', // Color de relleno (gris oscuro, opacidad baja)
    fillOpacity: 0.01, // Opacidad del relleno
    weight: 3 // Ancho de la línea
};

// Estilo para el hover
var highlightStyle = {
    color: '#555', // Gris medio para hover
    fillColor: '#555', // Gris medio para hover
    fillOpacity: 0.01,
    weight: 3
};

// Se eliminó el marcador de vista de calle al hacer clic en el mapa por solicitud del usuario.

// Capa de estados
var estadosLayer = L.geoJSON(estados, {
    style: initialStyle, // Aplicar estilo inicial
    onEachFeature: function (feature, layer) {
        layer.bindTooltip('<div class="custom-tooltip">' + feature.properties.NOMGEO + '</div>');
        layer.on('click', function (e) {
            cargarMunicipios(feature.properties.CVE_ENT);
            mapas[0].fitBounds(layer.getBounds()); // Centra el mapa en el estado
        });
        // Efecto de hover
        layer.on('mouseover', function (e) {
            layer.setStyle(highlightStyle);
        });
        layer.on('mouseout', function (e) {
            estadosLayer.resetStyle(layer);
        });
    }
}).addTo(mapas[0]);

console.log("Estados: ", estados);
console.log("Estados Layer: ", estadosLayer);

// Capa de municipios (inicialmente vacía)
var municipiosLayer = L.geoJSON(null, {
    style: initialStyle, // Aplicar estilo inicial
    onEachFeature: onEachMunicipio
}).addTo(mapas[0]);

function onEachMunicipio(feature, layer) {
    layer.bindTooltip('<div class="custom-tooltip">' + feature.properties.NOM_MUN + ', ' + feature.properties.NOMGEO + '</div>');
    // Efecto de hover
    layer.on('mouseover', function (e) {
        layer.setStyle(highlightStyle);
    });
    layer.on('mouseout', function (e) {
        municipiosLayer.resetStyle(layer);
    });

}

// Función para cargar los municipios correspondientes a un estado
function cargarMunicipios(cveEnt) {
    municipiosLayer.clearLayers();

    if (currentMarker) {
        mapas[0].removeLayer(currentMarker);
        currentMarker = null;
    }

    municipiosFiltrados = {
        type: "FeatureCollection",
        features: municipios_mapa.features.filter(function (feature) {
            return feature.properties.CVE_ENT === cveEnt;
        })
    };


    municipiosLayer.addData(municipiosFiltrados);
}

const capasConPermisos = [
    "🌞 Potencial Fotovoltaico",
    "☀️ Radiación Horizontal",
    "💨 Viento 10m",
    "💨 Viento 50m",
    "💨 Viento 100m",
    "💨 Viento 150m",
    "💨 Viento 200m"
];

function hayCapaConPermisosActiva() {
    return capasConPermisos.some(nombre => {
        const capa = rasterBaseLayers[nombre];
        return mapas[0].hasLayer(capa);
    });
}

function actualizarPlaceholderBusqueda(tipo) {
    const input = document.getElementById("busquedaGeneralInput");

    if (tipo === 'SINPERMISO') {
        input.placeholder = "Entidad Federativa o Municipio";
    } else {
        input.placeholder = "Número de Permiso, Entidad Federativa o Municipio";
    }
}

//Búsquedas
//Busquedas
var lastSearchedEstadoLayer = null; // para almacenar la última entidad federativa buscada
var lastSearchedMunicipioLayer = null; // para almacenar el último municipio buscado


function buscarGeneral() {
    var terminoBuscado = document.getElementById('busquedaGeneralInput').value.trim();

    if (!terminoBuscado) {
        alert("Por favor, introduce un término de búsqueda.");
        return;  // Termina la ejecución de la función si el campo está vacío
    }

    // Intenta buscar por número de permiso primero
    var encontrado = false;
    if (hayCapaConPermisosActiva()) {
        for (var i = 0; i < datosExpendios.length; i++) {
            var expendio = datosExpendios[i];
            if (expendio.numeroPermiso === terminoBuscado) {
                var lat = expendio.latitudGeo;
                var lon = expendio.longitudGeo;
                mapas[0].setView([lat, lon], 17);
                encontrado = true;
                break;
            }
        }
    } else {
        console.log("Búsqueda de permisos deshabilitada: no hay capas con permisos activas.");
    }

    // Si no se encontró por número de permiso, busca por entidad federativa
    if (!encontrado) {
        estadosLayer.eachLayer(function (layer) {
            if (layer.feature.properties.NOMGEO === terminoBuscado) {
                mapas[0].fitBounds(layer.getBounds());

                // Si ya había una entidad federativa buscada anteriormente, restablecemos su estilo
                if (lastSearchedEstadoLayer) {
                    estadosLayer.resetStyle(lastSearchedEstadoLayer);
                }

                // Resalta la entidad federativa encontrada
                layer.setStyle({
                    color: '#FF0000',
                    fillColor: '#FF0000',
                    fillOpacity: 0.5
                });

                lastSearchedEstadoLayer = layer;

                // Reiniciar el estilo de la entidad después de 5 segundos
                setTimeout(function () {
                    estadosLayer.resetStyle(lastSearchedEstadoLayer);
                    lastSearchedEstadoLayer = null;
                }, 5000);

                encontrado = true;
            }
        });
    }

    // Si aún no se encontró, busca por municipio en la fuente de datos completa
    if (!encontrado) {
        // Divide el término de búsqueda en municipio y estado
        var terminos = terminoBuscado.split(',');
        var buscadoMunicipio = terminos[0].trim();
        var buscadoEstado = terminos.length > 1 ? terminos[1].trim() : '';


        for (var i = 0; i < municipios_mapa.features.length; i++) {
            var municipio = municipios_mapa.features[i];
            var nombreMunicipio = municipio.properties.NOM_MUN;
            var nombreEstado = municipio.properties.NOMGEO;

            // Comprueba si el nombre del municipio y del estado coinciden con el término de búsqueda
            if (nombreMunicipio === buscadoMunicipio && (buscadoEstado === '' || nombreEstado === buscadoEstado)) {
                var bounds = L.geoJSON(municipio).getBounds();
                mapas[0].fitBounds(bounds);

                // Si ya había un municipio buscado anteriormente, lo elimina
                if (lastSearchedMunicipioLayer) {
                    mapas[0].removeLayer(lastSearchedMunicipioLayer);
                }

                // Agrega el municipio encontrado al mapa y lo resalta
                lastSearchedMunicipioLayer = L.geoJSON(municipio, {
                    style: {
                        color: '#FF0000',
                        fillColor: '#FF0000',
                        fillOpacity: 0.5
                    }
                }).addTo(mapas[0]);

                // Reiniciar el estilo y eliminar el municipio después de 5 segundos
                setTimeout(function () {
                    mapas[0].removeLayer(lastSearchedMunicipioLayer);
                    lastSearchedMunicipioLayer = null;
                }, 5000);

                encontrado = true;
                break;
            }
        }
    }


    if (!encontrado) {
        alert("Término no encontrado.");
    }




}

// Cuando se dibuja una línea, calcula la distancia
mapas[0].on('draw:created', function (e) {
    var type = e.layerType,
        layer = e.layer;

    if (type === 'polyline') {
        var latlngs = layer.getLatLngs();
        var distance = 0;
        for (var i = 1; i < latlngs.length; i++) {
            distance += latlngs[i - 1].distanceTo(latlngs[i]);
        }
        // Convertir la distancia a km y redondear a 2 decimales
        distance = Math.round((distance / 1000) * 100) / 100;
        // Crear un popup con la distancia
        layer.bindPopup('Distancia: ' + distance + ' km').openPopup();
        // Añadir la línea al mapa
        layer.addTo(mapas[0]);
    }
});




//Funciones de los botones y del Mapa*@



function limpiarMarcadores() {
    // Limpiar todas las capas de marcadores y círculos
    mapas[0].eachLayer(function (layer) {
        if (layer instanceof L.Marker || layer instanceof L.MarkerClusterGroup || layer instanceof L.Circle) {
            mapas[0].removeLayer(layer);
        }
    });


}
function handleNull(value) {
    return value ? value : "S/D-Sin Dato";
}

//Links activos*@
function activarElemento(elementoID) {
    // Obtén todos los elementos de tu menú
    var elementos = document.querySelectorAll('.navbarmapag a');

    // Itera sobre ellos para eliminar la clase 'active'
    elementos.forEach(function (el) {
        el.classList.remove('active');
    });

    // Añade la clase 'active' al elemento clickeado
    var elementoActivo = document.getElementById(elementoID);
    if (elementoActivo) {
        elementoActivo.classList.add('active');
    }
}



function removeEmptyRowsFromPopupContent(content, feature) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    var rows = tempDiv.querySelectorAll('tr');
    for (var i = 0; i < rows.length; i++) {
        var td = rows[i].querySelector('td.visible-with-data');
        var key = td ? td.id : '';
        if (td && td.classList.contains('visible-with-data') && feature.properties[key] == null) {
            rows[i].parentNode.removeChild(rows[i]);
        }
    }
    return tempDiv.innerHTML;
}

function addClassToPopupIfMedia(content, popup) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    if (tempDiv.querySelector('td img')) {
        popup._contentNode.classList.add('media');
            // Delay to force the redraw
            setTimeout(function() {
                popup.update();
            }, 10);
    } else {
        popup._contentNode.classList.remove('media');
    }
}

// --- Control de capas ---

var control = L.control.layers(rasterBaseLayers, null, { collapsed: false, position: 'topright' }).addTo(mapas[0]);



// --- Funciones para cargar y limpiar marcadores ---
// --- Validación segura para carga de KML ---
function validarNombreKML(input) {
    // No permitir vacíos, espacios solo, ni caracteres peligrosos
    var value = input.value.trim();
    // Expresión regular: solo letras, números, guiones, guion bajo, punto y espacios
    var regex = /^[\w\d\-_. ]+$/;
    if (!value) {
        input.setCustomValidity('El nombre no puede estar vacío.');
        return false;
    }
    if (!regex.test(value)) {
        input.setCustomValidity('Nombre inválido: solo letras, números, guiones, guion bajo, punto y espacios.');
        return false;
    }
    // Validación básica para evitar inyección de dependencias (no <, >, ;, |, &, etc)
    if (/[<>;|&$]/.test(value)) {
        input.setCustomValidity('Nombre inválido: no se permiten caracteres especiales.');
        return false;
    }
    input.setCustomValidity('');
    return true;
}

// Si tienes un input para el nombre del KML, agrega el listener:
setTimeout(function () {
    var kmlInput = document.getElementById('kmlFileNameInput');
    if (kmlInput) {
        kmlInput.addEventListener('input', function () {
            validarNombreKML(this);
        });
        kmlInput.addEventListener('blur', function () {
            validarNombreKML(this);
        });
    }
}, 1000);


// --- Links de descarga de capas ---
// Coloca los links directamente en el div desde el JS al cargar la página
function ponerLinksDescargaDirectos() {
    var contenedor = document.getElementById('descarga-capas');
    if (!contenedor) return;
    contenedor.innerHTML = `
        <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>🌞 Potencial Fotovoltaico</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/rasters/potencialfotovoltaico_4326_0.png" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>☀️ Radiación Horizontal</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/rasters/radiacionhorizontal_4326_0.png" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💨 Velocidad de Viento 10m</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/rasters/Velocidaddevientoa10mdealtura_4.png" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💨 Velocidad de Viento 50m</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/rasters/Velocidaddevientoa50mdealtura_3.png" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💨 Velocidad de Viento 100m</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/rasters/Velocidaddevientoa100mdealtura_2.png" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💨 Velocidad de Viento 150m</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/rasters/Velocidaddevientoa150mdealtura_1.png" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💨 Velocidad de Viento 200m</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/rasters/Velocidaddevientoa200mdealtura_0.png" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>🛢️ Residuos Industriales</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/data/ResiduosindustrialesEscenario3_13.js" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>🐄 Residuos Pecuarios</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/data/ResiduospecuariosEscenario3_10.js" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>🗑️ Residuos Urbanos</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/data/ResiduosurbanosEscenario3_7.js" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>🌲 Residuos Forestales</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/data/ResiduosforestalesEscenario3_4.js" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>🌋 Geotérmica</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/data/GeotermicaEscenario4_0.js" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💧 Disponibilidad Hídrica</span>
                <a href="https://cdn.sassoapps.com/Geovisualizador/data/Cuencas_Disponibilidad_2023_0" download target="_blank" class="btn btn-sm btn-outline-primary">Descargar</a>
            </li>
        </ul>
    `;
}

// Al cargar la página, asegurar capa por defecto y links reales
document.addEventListener('DOMContentLoaded', function () {
    // Mostrar panel de descarga de capas si está oculto
    var descargaPanel = document.getElementById('descarga-capas');
    if (descargaPanel) {
        descargaPanel.style.display = '';
    }
    // Coloca los links de descarga directamente
    ponerLinksDescargaDirectos();
    // Forzar que solo el raster de Potencial Fotovoltaico esté activo al cargar la página
    // Elimina todos los overlays raster (imageOverlay) antes de agregar el de fotovoltaico
    // Eliminar todas las capas base raster que puedan estar activas
    for (const nombre in rasterBaseLayers) {
        const capa = rasterBaseLayers[nombre];
        if (mapas[0].hasLayer(capa)) {
            mapas[0].removeLayer(capa);
        }
    }
    if (rasterBaseLayers["🌞 Potencial Fotovoltaico"]) {
        rasterBaseLayers["🌞 Potencial Fotovoltaico"].addTo(mapas[0]);
        rasterActivo = rasterBaseLayers["🌞 Potencial Fotovoltaico"];
    }
    // Mostrar leyenda de Potencial Fotovoltaico
    hideAllColorRamps();
    var defaultRamp = document.getElementById('simbol-fotovoltaico');
    if (defaultRamp) {
        defaultRamp.style.display = '';
    }
    // setTimeout(agregarBotonCentrarMapa, 200);
});


function limpiarMarcadores() {
    mapas[0].eachLayer(function (layer) {
        if (layer instanceof L.Marker || layer instanceof L.MarkerClusterGroup || layer instanceof L.Circle) {
            mapas[0].removeLayer(layer);
        }
    });
}

// --- Control de opacidad para raster activo ---
var rasterActivo = rasterBaseLayers["🌞 Potencial Fotovoltaico"];

// Crear el control visual (slider)
var opacityControl = L.control({ position: 'topleft' });
opacityControl.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    div.style.background = '#fff';
    div.style.padding = '6px 10px 2px 10px';
    div.style.width = '160px';
    div.innerHTML = '<label style="font-size:12px;">Opacidad raster</label><br><input id="raster-opacity-slider" type="range" min="0" max="1" step="0.01" value="1" style="width:130px;">';

    // Evitar que el mapa se mueva al interactuar con el control
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
};
opacityControl.addTo(mapas[0]);

// Evento para cambiar opacidad
setTimeout(function () {
    var slider = document.getElementById('raster-opacity-slider');
    if (slider) {
        slider.addEventListener('input', function () {
            var valor = parseFloat(this.value);

            if (!rasterActivo) return;

            if (typeof rasterActivo.setOpacity === 'function') {
                rasterActivo.setOpacity(valor);
            } 
            else if (rasterActivo.eachLayer) {
                rasterActivo.eachLayer(function (layer) {
                    if (typeof layer.setOpacity === 'function') {
                        layer.setOpacity(valor);
                    }
                });
            }
        });
    }
}, 500);

function hideAllColorRamps() {
    var rampIds = ['simbol-fotovoltaico', 'simbol-radiacion', 'simbol-viento'];
    rampIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    });
}

// Cargar capa y marcadores por defecto
// rasterActivo.addTo(mapas[0]);

// Ocultar todas las rampas al inicio y luego mostrar la por defecto
hideAllColorRamps();
var defaultRamp = document.getElementById('simbol-fotovoltaico');
if (defaultRamp) {
    defaultRamp.style.display = '';
}

// --- Evento para cambio de capa raster ---
// mapas[0].on('baselayerchange', function (e) {
//     // Si es un estilo de mapa y no un raster temático, no limpiar marcadores
//     const capasTematicas = [
//         "🌞 Potencial Fotovoltaico",
//         "☀️ Radiación Horizontal",
//         "💨 Viento", // puedes usar startsWith más abajo
//         "🛢️ Residuos Industriales",
//         "🐄 Residuos Pecuarios",
//         "🗑️ Residuos Urbanos",
//         "🌲 Residuos Forestales",
//         "🌋 Geotérmica",
//         "💧 Disponibilidad Hídrica"
//     ];

//     if (!capasTematicas.some(nombre => e.name.startsWith(nombre.replace(/.$/, "")))) {
//         return; // Es un cambio de estilo base → no tocar marcadores
//     }

//     limpiarMarcadores();
    
//     // Quitar opacidad al raster anterior
//     if (rasterActivo && typeof rasterActivo.setOpacity === 'function') {
//         rasterActivo.setOpacity(1);
//     }
//     rasterActivo = e.layer;
//     // Sincronizar slider con la opacidad actual
//     var slider = document.getElementById('raster-opacity-slider');
//     if (slider && rasterActivo && typeof rasterActivo.options.opacity !== 'undefined') {
//         slider.value = rasterActivo.options.opacity;
//     } else if (slider) {
//         slider.value = 1;
//     }

//     // Oculta todas las leyendas y rampas (solo si existen)
//     var tablas = [
//         'simbol-fotovoltaico',
//         'simbol-radiacion',
//         'simbol-viento'
//     ];
//     tablas.forEach(function (id) {
//         var el = document.getElementById(id);
//         if (el) el.style.display = 'none';
//     });

//     // Determina qué leyenda/rampa mostrar (solo si existen)
//     if (e.name === '🌞 Potencial Fotovoltaico') {
//         var t = document.getElementById('simbol-fotovoltaico');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(lay);
//         mapas[0].removeControl(layDC);
//         actualizarPlaceholderBusqueda('PERMISO');
//     } else if (e.name === '☀️ Radiación Horizontal') {
//         var t = document.getElementById('simbol-radiacion');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(lay);
//         mapas[0].removeControl(layDC);
//         actualizarPlaceholderBusqueda('PERMISO');
//     } else if (e.name && e.name.startsWith('💨 Viento')) {
//         var t = document.getElementById('simbol-viento');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(lay);
//         mapas[0].removeControl(layDC);
//         actualizarPlaceholderBusqueda('PERMISO');
//     } else if (e.name === '🛢️ Residuos Industriales') {
//         var t = document.getElementById('simbol-biomasa');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(layDC);
//         lay.addTo(mapas[0]);
//         actualizarPlaceholderBusqueda('SINPERMISO');
//     } else if (e.name === '🐄 Residuos Pecuarios') {
//         var t = document.getElementById('simbol-biomasa');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(layDC);
//         lay.addTo(mapas[0]);
//         actualizarPlaceholderBusqueda('SINPERMISO');
//     } else if (e.name === '🗑️ Residuos Urbanos') {
//         var t = document.getElementById('simbol-biomasa');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(layDC);
//         lay.addTo(mapas[0]);
//         actualizarPlaceholderBusqueda('SINPERMISO');
//     } else if (e.name === '🌲 Residuos Forestales') {
//         var t = document.getElementById('simbol-biomasa');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(layDC);
//         lay.addTo(mapas[0]);
//         actualizarPlaceholderBusqueda('SINPERMISO');
//     } else if (e.name === '🌋 Geotérmica') {
//         var t = document.getElementById('simbol-geotermica');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(layDC);
//         lay.addTo(mapas[0]);
//         actualizarPlaceholderBusqueda('SINPERMISO');
//     } 
//     else if (e.name === '💧 Disponibilidad Hídrica'){
//         var t = document.getElementById('simbol-hidrica');
//         if (t) t.style.display = '';
//         mapas[0].removeControl(lay);
//         layDC.addTo(mapas[0]);
//         actualizarPlaceholderBusqueda('SINPERMISO');
//     }

//     // Limpiar input del buscador y términos
//     var input = document.getElementById("busquedaGeneralInput");
//     if (input) input.value = "";
//     availableTerms = [];

//     if (e.name === "🌞 Potencial Fotovoltaico" || e.name === "☀️ Radiación Horizontal") {
//         cargarMarcadoresFotovoltaico();
//     } else if (e.name && e.name.startsWith("💨 Viento")) {
//         cargarMarcadoresViento();
//     }
//     // El autocompletado se actualiza dentro de las funciones de carga
// });

// --- Inicialización del plugin de impresión ---
// Crear preloader
const preloader = document.createElement('div');
preloader.id = 'preloader';
preloader.innerHTML = '<div class="spinner"></div>';
preloader.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(255,255,255,0.7);
    display: none;
    z-index: 9999;
    justify-content: center;
    align-items: center;
`;
document.body.appendChild(preloader);

// Estilos del spinner
const style = document.createElement('style');
style.innerHTML = `
  .spinner {
    border: 8px solid #f3f3f3;
    border-top: 8px solid #333;
    border-radius: 50%;
    width: 60px;
    height: 60px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

// Inicializar el printer
const printer = L.easyPrint({
    tileLayer: null,
    sizeModes: ['Current', 'A4Portrait', 'A4Landscape'],
    filename: 'captura_mapa',
    exportOnly: true,
    hideControlContainer: true
}).addTo(mapas[0]);

const esperarOpcionesImpresion = setInterval(() => {
    const currentSizeBtn = document.querySelector('.CurrentSize');
    const a4PortraitBtn = document.querySelector('.A4Portrait');
    const a4LandscapeBtn = document.querySelector('.A4Landscape');

    if (currentSizeBtn && a4PortraitBtn && a4LandscapeBtn) {
        console.log('🎯 Botones de opciones de impresión detectados.');

        const mostrarPreloader = () => {
            console.log('⏳ Mostrando preloader...');
            document.getElementById('ajax-preloader').style.display = 'flex';

            // Esperamos unos segundos para ocultarlo (ej. 3 segundos)
            setTimeout(() => {
                document.getElementById('ajax-preloader').style.display = 'none';
            }, 3500);
        };

        currentSizeBtn.addEventListener('click', mostrarPreloader);
        a4PortraitBtn.addEventListener('click', mostrarPreloader);
        a4LandscapeBtn.addEventListener('click', mostrarPreloader);

        clearInterval(esperarOpcionesImpresion); // Ya no es necesario seguir buscando
    }
}, 500);
