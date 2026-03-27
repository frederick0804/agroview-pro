$ErrorActionPreference = 'Stop'
$path = 'src/pages/Configuracion.tsx'
$text = Get-Content $path -Raw

function ReplaceToken([string]$old, [string]$new) {
  $script:text = $script:text.Replace($old, $new)
}

# 1) Mojibake UTF-8 mal decodificado (Ã¡, Ã©, ...)
$c3 = [char]0x00C3
$c2 = [char]0x00C2

ReplaceToken ($c3 + [char]0x00A1) ([string][char]0x00E1)  # á
ReplaceToken ($c3 + [char]0x00A9) ([string][char]0x00E9)  # é
ReplaceToken ($c3 + [char]0x00AD) ([string][char]0x00ED)  # í
ReplaceToken ($c3 + [char]0x00B3) ([string][char]0x00F3)  # ó
ReplaceToken ($c3 + [char]0x00BA) ([string][char]0x00FA)  # ú
ReplaceToken ($c3 + [char]0x00B1) ([string][char]0x00F1)  # ñ

ReplaceToken ($c3 + [char]0x0081) ([string][char]0x00C1)  # Á
ReplaceToken ($c3 + [char]0x0089) ([string][char]0x00C9)  # É
ReplaceToken ($c3 + [char]0x008D) ([string][char]0x00CD)  # Í
ReplaceToken ($c3 + [char]0x0093) ([string][char]0x00D3)  # Ó
ReplaceToken ($c3 + [char]0x009A) ([string][char]0x00DA)  # Ú
ReplaceToken ($c3 + [char]0x0091) ([string][char]0x00D1)  # Ñ

ReplaceToken ($c2 + [char]0x00B0) ([string][char]0x00B0)  # °

# 2) Tokens con +� (U+FFFD)
$bad = [char]0xFFFD
ReplaceToken ("Producci+" + $bad + "n") "Producción"
ReplaceToken ("An+" + $bad + "lisis") "Análisis"
ReplaceToken ("N+" + $bad + "mero") "Número"
ReplaceToken ("S+" + $bad + "/No") "Sí/No"
ReplaceToken ("Relaci+" + $bad + "n") "Relación"
ReplaceToken ("Jefe de +" + $bad + "rea") "Jefe de Área"
ReplaceToken ("J." + $bad + "rea") "J.Área"
ReplaceToken ("jer+" + $bad + "rquico") "jerárquico"
ReplaceToken ("par+" + $bad + "metro") "parámetro"
ReplaceToken ("par+" + $bad + "metros") "parámetros"
ReplaceToken ("definici+" + $bad + "n") "definición"
ReplaceToken ("edici+" + $bad + "n") "edición"
ReplaceToken ("eliminaci+" + $bad + "n") "eliminación"
ReplaceToken ("vac+" + $bad + "a") "vacía"

# 3) Tokens con ? comunes en textos de UI
ReplaceToken "Configuraci?n" "Configuración"
ReplaceToken "definici?n" "definición"
ReplaceToken "M?dulo" "Módulo"
ReplaceToken "M?dulos" "Módulos"
ReplaceToken "m?dulo" "módulo"
ReplaceToken "b?squeda" "búsqueda"
ReplaceToken "B?sico" "Básico"
ReplaceToken "b?sico" "básico"
ReplaceToken "par?metro" "parámetro"
ReplaceToken "par?metros" "parámetros"
ReplaceToken "versi?n" "versión"
ReplaceToken "descripci?n" "descripción"
ReplaceToken "Descripci?n" "Descripción"
ReplaceToken "C?digo" "Código"
ReplaceToken "C?lculo" "Cálculo"
ReplaceToken "N?mero" "Número"
ReplaceToken "S?/No" "Sí/No"
ReplaceToken "Relaci?n" "Relación"
ReplaceToken "producci?n" "producción"
ReplaceToken "m?nimo" "mínimo"
ReplaceToken "M?nimo" "Mínimo"
ReplaceToken "m?x" "máx"
ReplaceToken "m?ltiples" "múltiples"
ReplaceToken "acci?n" "acción"
ReplaceToken "operaci?n" "operación"
ReplaceToken "eliminaci?n" "eliminación"
ReplaceToken "reversi?n" "reversión"
ReplaceToken "Activar?s" "Activarás"
ReplaceToken "qu?" "qué"
ReplaceToken "Qu?" "Qué"
ReplaceToken "est?" "está"
ReplaceToken "est?n" "están"
ReplaceToken "s?lo" "sólo"
ReplaceToken "S?" "Sí"
ReplaceToken "m?s" "más"
ReplaceToken "a?n" "aún"
ReplaceToken "tambi?n" "también"
ReplaceToken "p?gina" "página"
ReplaceToken "auditor?a" "auditoría"
ReplaceToken "gu?a" "guía"
ReplaceToken "opci?n" "opción"
ReplaceToken "selecci?n" "selección"
ReplaceToken "aplicar?n" "aplicarán"
ReplaceToken "crear?n" "crearán"
ReplaceToken "estar?amos" "estaríamos"
ReplaceToken "podr?" "podrá"
ReplaceToken "Podr?s" "Podrás"
ReplaceToken "quedar?" "quedará"
ReplaceToken "quedar?n" "quedarán"
ReplaceToken "autom?ticamente" "automáticamente"
ReplaceToken "espec?fico" "específico"
ReplaceToken "espec?ficos" "específicos"
ReplaceToken "simult?neamente" "simultáneamente"
ReplaceToken "r?pido" "rápido"
ReplaceToken "r?pida" "rápida"
ReplaceToken "r?pidas" "rápidas"
ReplaceToken "reci?n" "recién"
ReplaceToken "Cat?logo" "Catálogo"
ReplaceToken "Hect?reas" "Hectáreas"
ReplaceToken "Pa?s" "País"
ReplaceToken "P?rez" "Pérez"
ReplaceToken "Contrase?a" "Contraseña"
ReplaceToken "t?cnico" "técnico"
ReplaceToken "v?lido" "válido"
ReplaceToken "?ltima" "última"
ReplaceToken "?ltimo" "último"
ReplaceToken "?lt." "últ."
ReplaceToken "?nica" "única"
ReplaceToken "?rea" "área"
ReplaceToken "Est?ndar" "Estándar"
ReplaceToken "Gesti?n" "Gestión"
ReplaceToken "informaci?n" "información"
ReplaceToken "jerarqu?a" "jerarquía"
ReplaceToken "Validaci?n" "Validación"
ReplaceToken "Distribuci?n" "Distribución"
ReplaceToken "Direcci?n" "Dirección"
ReplaceToken "Personalizaci?n" "Personalización"
ReplaceToken "Asignaci?n" "Asignación"
ReplaceToken "Justificaci?n" "Justificación"
ReplaceToken "Protecci?n" "Protección"
ReplaceToken "Agrupaci?n" "Agrupación"
ReplaceToken "Activaci?n" "Activación"
ReplaceToken "Secci?n" "Sección"
ReplaceToken "sesi?n" "sesión"
ReplaceToken "restricci?n" "restricción"
ReplaceToken "expl?cito" "explícito"
ReplaceToken "plantaci?n" "plantación"
ReplaceToken "Macrot?nel" "Macrotúnel"
ReplaceToken "pesta?a" "pestaña"

# 4) Puntuación visible en UI
ReplaceToken "Buscar formulario?" "Buscar formulario…"
ReplaceToken "<span>?</span>" "<span>·</span>"
ReplaceToken "Nueva definición ? {label}" "Nueva definición · {label}"
ReplaceToken "?? Global ? todos los cultivos" "Global para todos los cultivos"
ReplaceToken "?? {c.nombre}" "{c.nombre}"
ReplaceToken "-+Eliminar " "¿Eliminar "

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $text, $enc)
Write-Output 'OK'
