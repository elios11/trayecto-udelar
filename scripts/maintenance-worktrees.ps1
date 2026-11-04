param([ValidateSet('Audit','Clean','Compress')][string]$Mode = 'Audit')
$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$trees = [IO.Path]::GetFullPath((Join-Path $repo '.worktrees'))
$reportDir = Join-Path $repo 'tmp/disk-cleanup'
$active = 'd03bh-fder-notariado-2016'
$buildNames = @('dist','.next','.vinext')
$options = [IO.EnumerationOptions]::new()
$options.RecurseSubdirectories = $true
$options.IgnoreInaccessible = $true
$options.AttributesToSkip = [IO.FileAttributes]::ReparsePoint
function Size([string]$Path) {
  [long]$bytes = 0
  if (Test-Path -LiteralPath $Path) {
    foreach ($f in ([IO.DirectoryInfo]$Path).EnumerateFiles('*',$options)) { $bytes += $f.Length }
  }
  return $bytes
}
function AssertTree([string]$Path) {
  $resolved = [IO.Path]::GetFullPath($Path)
  if ([IO.Path]::GetDirectoryName($resolved) -ne $trees) { throw "Fuera del alcance: $resolved" }
  if ((Get-Item -LiteralPath $resolved -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Worktree enlazado: $resolved" }
}
if ($Mode -eq 'Compress') {
  New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
  foreach ($tree in Get-ChildItem -LiteralPath $trees -Directory -Force) {
    AssertTree $tree.FullName
    if ($tree.Name -eq $active) { continue }
    foreach ($name in @('data','app')) {
      $target = Join-Path $tree.FullName $name
      if (-not (Test-Path -LiteralPath $target)) { continue }
      if ((Get-Item -LiteralPath $target -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
      $hasLinks = $false
      $scan = [Collections.Generic.Stack[string]]::new()
      $scan.Push($target)
      while ($scan.Count -gt 0) {
        foreach ($entry in ([IO.DirectoryInfo]$scan.Pop()).EnumerateFileSystemInfos()) {
          if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { $hasLinks = $true; continue }
          if ($entry.Attributes -band [IO.FileAttributes]::Directory) { $scan.Push($entry.FullName) }
        }
      }
      if (-not $hasLinks) {
        & compact.exe /C "/S:$target" /I /Q | Out-File -LiteralPath (Join-Path $reportDir 'compression.log') -Append
        if ($LASTEXITCODE -ne 0) { throw "Error al comprimir $target; consultar registro." }
        continue
      }
      $batch = @()
      foreach ($file in ([IO.DirectoryInfo]$target).EnumerateFiles('*',$options)) {
        $batch += $file.FullName
        if ($batch.Count -eq 80) {
          & compact.exe /C /I /Q @batch | Out-File -LiteralPath (Join-Path $reportDir 'compression.log') -Append
          if ($LASTEXITCODE -ne 0) { throw "Error al comprimir $target; consultar registro." }
          $batch = @()
        }
      }
      if ($batch.Count) {
        & compact.exe /C /I /Q @batch | Out-File -LiteralPath (Join-Path $reportDir 'compression.log') -Append
        if ($LASTEXITCODE -ne 0) { throw "Error al comprimir $target; consultar registro." }
      }
    }
    Write-Output "Datos comprimidos sin cambiar contenido: $($tree.Name)"
  }
  exit 0
}
$registered = @(git -C $repo worktree list --porcelain | Where-Object { $_.StartsWith('worktree ') } | ForEach-Object { [IO.Path]::GetFullPath($_.Substring(9)) })
$rows = @()
if ($Mode -eq 'Clean') {
  $rows = @(Get-Content -LiteralPath (Join-Path $reportDir 'audit.json') -Raw | ConvertFrom-Json)
}
foreach ($tree in $(if ($Mode -eq 'Audit') { Get-ChildItem -LiteralPath $trees -Directory -Force })) {
  AssertTree $tree.FullName
  if ($registered -notcontains $tree.FullName) { continue }
  $status = @(git -C $tree.FullName status --porcelain --ignored=matching)
  if ($LASTEXITCODE -ne 0) { throw "No se pudo revisar $($tree.Name)" }
  $head = (git -C $tree.FullName rev-parse HEAD).Trim()
  $changes = @($status | Where-Object { -not $_.StartsWith('!! ') })
  # Ignorados que no son builds o dependencias pueden ser fuentes o checkpoints únicos.
  $protected = @($status | Where-Object { $_.StartsWith('!! ') -and $_.Substring(3) -notmatch '^(dist|\.next|\.vinext|node_modules)/?$' })
  git -C $repo merge-base --is-ancestor $head main
  $integrated = $LASTEXITCODE -eq 0
  if (-not $integrated -and $changes.Count -eq 0) {
    $unique = @(git -C $repo cherry main $head | Where-Object { $_.StartsWith('+') })
    $integrated = $LASTEXITCODE -eq 0 -and $unique.Count -eq 0
  }
  $remove = $tree.Name -ne $active -and $changes.Count -eq 0 -and $protected.Count -eq 0 -and $integrated
  $builds = @()
  if ($tree.Name -ne $active) {
    foreach ($name in $buildNames) {
      $build = Join-Path $tree.FullName $name
      if (-not (Test-Path -LiteralPath $build)) { continue }
      if ((Get-Item -LiteralPath $build -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
      $tracked = @(git -C $tree.FullName ls-files -- $name)
      git -C $tree.FullName check-ignore -q -- $name
      if ($LASTEXITCODE -ne 0 -or $tracked.Count -gt 0) { continue }
      $builds += [pscustomobject]@{Path=$build;Bytes=(Size $build)}
    }
  }
  $rows += [pscustomobject]@{Name=$tree.Name;Path=$tree.FullName;Head=$head;Integrated=$integrated;Changes=$changes;ProtectedIgnored=$protected;Remove=$remove;Bytes=(Size $tree.FullName);Builds=$builds}
}
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
$rows | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $reportDir 'audit.json') -Encoding utf8
if ($Mode -eq 'Clean') {
  foreach ($row in $rows) {
    AssertTree $row.Path
    if ($row.Remove) {
      $currentHead = (git -C $row.Path rev-parse HEAD).Trim()
      $currentStatus = @(git -C $row.Path status --porcelain --ignored=matching)
      if ($currentHead -ne $row.Head -or ($currentStatus | Where-Object { -not $_.StartsWith('!! ') -or $_.Substring(3) -notmatch '^(dist|\.next|\.vinext|node_modules)/?$' })) {
        throw "El worktree cambió desde la auditoría: $($row.Name)"
      }
      git -C $repo worktree remove -- $row.Path
      if ($LASTEXITCODE -ne 0) { throw "Git preservó el worktree $($row.Name); revisar antes de reintentar." }
      Write-Output "Retirado: $($row.Name)"
    } else {
      foreach ($build in $row.Builds) {
        $resolved = [IO.Path]::GetFullPath($build.Path)
        if ([IO.Path]::GetDirectoryName($resolved) -ne $row.Path -or [IO.Path]::GetFileName($resolved) -notin $buildNames) { throw "Build fuera de alcance: $resolved" }
        $trackedNow = @(git -C $row.Path ls-files -- ([IO.Path]::GetFileName($resolved)))
        if ($trackedNow.Count -gt 0 -or ((Get-Item -LiteralPath $resolved -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Build protegido: $resolved" }
        Remove-Item -LiteralPath $resolved -Recurse -Force
        Write-Output "Build regenerable retirado: $resolved"
      }
    }
  }
}
$summary = [pscustomobject]@{Worktrees=$rows.Count;Retirable=@($rows | Where-Object Remove).Count;RetirableGiB=[math]::Round((($rows | Where-Object Remove | Measure-Object Bytes -Sum).Sum)/1GB,2);BuildGiB=[math]::Round((($rows | Where-Object {-not $_.Remove} | ForEach-Object Builds | Measure-Object Bytes -Sum).Sum)/1GB,2);Report=(Join-Path $reportDir 'audit.json')}
$summary | Format-List
