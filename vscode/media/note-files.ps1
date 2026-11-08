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
$headers = @{}
$headerBytes = 0
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
        if ($request.headerBytes -and ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
        if ($request.headerBytes -and $paths.Count -ge $request.maxFiles) { $errors.Add('The note chooser reached its file limit.'); $pending.Clear(); break }
        $relative = $entry.FullName.Substring($root.FullName.TrimEnd('\').Length + 1).Replace('\','/')
        $paths.Add($relative)
        if ($request.headerBytes -and $headerBytes -lt $request.maxBytes) {
          $stream = $null
          try {
            $stream = [IO.File]::Open($entry.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, ([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
            $buffer = [byte[]]::new([Math]::Min($request.headerBytes, $request.maxBytes - $headerBytes))
            $read = $stream.Read($buffer, 0, $buffer.Length)
            $headers[$relative] = [Convert]::ToBase64String($buffer, 0, $read)
            $headerBytes += $read
          } catch { $errors.Add('A note title could not be read.') }
          finally { if ($stream) { $stream.Dispose() } }
        }
      }
    }
  } catch { $errors.Add($_.Exception.Message) }
}
[ordered]@{ headers = $headers; paths = @($paths); complete = ($errors.Count -eq 0); errors = @($errors); entries = $entries; skipped = $skipped } | ConvertTo-Json -Compress
