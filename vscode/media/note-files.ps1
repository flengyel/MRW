$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
$root = [IO.DirectoryInfo]::new($request.root)
$pending = [Collections.Generic.Stack[object]]::new()
$pending.Push(@($root, 0))
$paths = [Collections.Generic.List[string]]::new()
$errors = [Collections.Generic.List[string]]::new()
$entries = 0
$skipped = 0
while ($pending.Count -gt 0 -and $entries -le $request.maxEntries) {
  $item = $pending.Pop()
  try {
    foreach ($entry in $item[0].EnumerateFileSystemInfos()) {
      $directory = ($entry.Attributes -band [IO.FileAttributes]::Directory) -ne 0
      if ($directory -and $entry.Name -in @('.obsidian','.trash','.git','.lake','node_modules','.venv','__pycache__')) { $skipped++; continue }
      if (-not $directory -and $entry.Extension -notin @('.md','.markdown')) { continue }
      $entries++
      if ($entries -gt $request.maxEntries) { $errors.Add('The notes folder exceeds the filename entry limit.'); break }
      if ($directory) {
        if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
        if ($item[1] -ge $request.maxDepth) { $errors.Add('The notes folder exceeds the directory depth limit.'); continue }
        $pending.Push(@($entry, ($item[1] + 1)))
      } else {
        $paths.Add($entry.FullName.Substring($root.FullName.TrimEnd('\').Length + 1).Replace('\','/'))
      }
    }
  } catch { $errors.Add($_.Exception.Message) }
}
[ordered]@{ paths = @($paths); complete = ($errors.Count -eq 0); errors = @($errors); entries = $entries; skipped = $skipped } | ConvertTo-Json -Compress
