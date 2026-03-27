$ErrorActionPreference = 'Stop'
$path = 'src/pages/Configuracion.tsx'
$text = Get-Content $path -Raw
$enc1252 = [System.Text.Encoding]::GetEncoding(1252)

$mojiChars = @([char]0x00C3, [char]0x00C2, [char]0x00E2, [char]0x00EF)
$mojiSet = [string]::Concat($mojiChars)

function Decode-MojibakeToken([string]$token) {
  $current = $token
  for ($i = 0; $i -lt 4; $i++) {
    $hasMojibake = $false
    foreach ($ch in $mojiChars) {
      if ($current.IndexOf($ch) -ge 0) { $hasMojibake = $true; break }
    }
    if (-not $hasMojibake) { break }

    $next = [System.Text.Encoding]::UTF8.GetString($enc1252.GetBytes($current))
    if ($next -eq $current) { break }
    $current = $next
  }
  return $current
}

$pattern = "[^\s\"'<>]*[" + [regex]::Escape($mojiSet) + "][^\s\"'<>]*"
$text = [regex]::Replace($text, $pattern, {
  param($m)
  Decode-MojibakeToken $m.Value
})

# Correcciones de remanentes con caracter de reemplazo
$bad = [char]0xFFFD
$text = $text.Replace(("Producci+" + $bad + "n"), "Producción")
$text = $text.Replace(("An+" + $bad + "lisis"), "Análisis")
$text = $text.Replace(("N+" + $bad + "mero"), "Número")
$text = $text.Replace(("S+" + $bad + "/No"), "Sí/No")
$text = $text.Replace(("Relaci+" + $bad + "n"), "Relación")
$text = $text.Replace(("Jefe de +" + $bad + "rea"), "Jefe de Área")
$text = $text.Replace(("J." + $bad + "rea"), "J.Área")
$text = $text.Replace(("jer+" + $bad + "rquico"), "jerárquico")
$text = $text.Replace(("par+" + $bad + "metro"), "parámetro")
$text = $text.Replace(("par+" + $bad + "metros"), "parámetros")
$text = $text.Replace(("definici+" + $bad + "n"), "definición")
$text = $text.Replace(("edici+" + $bad + "n"), "edición")
$text = $text.Replace(("eliminaci+" + $bad + "n"), "eliminación")
$text = $text.Replace(("vac+" + $bad + "a"), "vacía")

# Correcciones de signos visibles
$text = $text.Replace("Buscar formulario?", "Buscar formulario…")
$text = $text.Replace("<span>?</span>", "<span>·</span>")
$text = $text.Replace("Nueva definición ? {label}", "Nueva definición · {label}")
$text = $text.Replace("?? Global ? todos los cultivos", "Global para todos los cultivos")
$text = $text.Replace("?? {c.nombre}", "{c.nombre}")
$text = $text.Replace("-+Eliminar ", "¿Eliminar ")

# Remanentes con ? en palabras frecuentes
$common = @{
  'Configuraci?n'='Configuración'; 'definici?n'='definición'; 'M?dulo'='Módulo'; 'm?dulo'='módulo';
  'b?squeda'='búsqueda'; 'B?sico'='Básico'; 'b?sico'='básico'; 'par?metro'='parámetro'; 'par?metros'='parámetros';
  'versi?n'='versión'; 'descripci?n'='descripción'; 'Descripci?n'='Descripción'; 'C?digo'='Código';
  'N?mero'='Número'; 'S?/No'='Sí/No'; 'Relaci?n'='Relación'; 'producci?n'='producción';
  'm?nimo'='mínimo'; 'M?nimo'='Mínimo'; 'acci?n'='acción'; 'operaci?n'='operación';
  'eliminaci?n'='eliminación'; 'qu?'='qué'; 'Qu?'='Qué'; 'est?'='está'; 'est?n'='están';
  'a?n'='aún'; 'm?s'='más'; 'tambi?n'='también'; 'opci?n'='opción'; 'selecci?n'='selección';
  '?ltima'='última'; '?ltimo'='último'; '?nica'='única'; '?rea'='área'; 'Gesti?n'='Gestión';
  'informaci?n'='información'; 'Secci?n'='Sección'; 'sesi?n'='sesión'; 'ConfiguraciÃ³n'='Configuración';
}
foreach($k in $common.Keys){ $text = $text.Replace($k, $common[$k]) }

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $text, $enc)
Write-Output 'OK'
