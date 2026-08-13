Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
pnpm run dev
