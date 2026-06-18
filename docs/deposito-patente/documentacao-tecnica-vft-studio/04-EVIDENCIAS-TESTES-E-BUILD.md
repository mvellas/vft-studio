# Evidencias de Testes e Build - VFT Studio

## 1. Testes automatizados executados

### Testes de licenciamento

Comando executado:

```bash
uv run --with pytest --with pytest-asyncio pytest tests/test_license.py -q
```

Resultado observado:

- 3 testes executados.
- 3 testes aprovados.
- Um aviso de depreciacao do FastAPI relacionado a constante HTTP 422, sem impacto funcional nos testes.

### Testes de licenciamento e APIs essenciais

Comando executado:

```bash
uv run --with pytest --with pytest-asyncio pytest tests/test_license.py tests/test_api.py -q
```

Resultado observado:

- 28 testes executados.
- 28 testes aprovados.
- Avisos de depreciacao do FastAPI, sem falha funcional.

## 2. Build de frontend

Comando executado:

```bash
npm run build
```

Resultado observado:

- TypeScript compilado com sucesso.
- Vite gerou `frontend/dist/`.
- Houve apenas aviso de chunk JavaScript acima de 500 kB, sem falha de build.

## 3. Build macOS

Comando executado:

```bash
uv run --with pyinstaller python build.py --target macos --skip-frontend --clean
```

Resultado observado:

- PyInstaller gerou `dist/VFT Studio.app`.
- Bundle assinado localmente/ad-hoc pelo processo de build.
- Catalogo de serial keys local incluido em `Contents/Resources/license/serial-keys.json`.
- Icone do aplicativo incluido em `Contents/Resources/app-icon.icns`.

## 4. Geracao de instalador macOS

Comando executado:

```bash
hdiutil create -volname "VFT Studio" -srcfolder "dist/VFT Studio.app" -ov -format UDZO "dist/VFT-Studio-macOS.dmg"
```

Resultado observado:

- DMG criado em `dist/VFT-Studio-macOS.dmg`.
- Tamanho aproximado observado: 33 MB.

## 5. Verificacao de icone do app

Comando executado:

```bash
plutil -p "dist/VFT Studio.app/Contents/Info.plist" | rg "Icon|Bundle"
```

Resultado relevante:

```text
"CFBundleIconFile" => "app-icon.icns"
"CFBundleDisplayName" => "VFT Studio"
"CFBundleIdentifier" => "com.vftstudio.app"
```

Tambem foi verificada a existencia de:

```text
dist/VFT Studio.app/Contents/Resources/app-icon.icns
```

## 6. Verificacao de serial keys no bundle

Comando executado:

```bash
find "dist/VFT Studio.app/Contents/Resources" -maxdepth 3 -type f -name "serial-keys.json" -print
```

Resultado relevante:

```text
dist/VFT Studio.app/Contents/Resources/license/serial-keys.json
```

## 7. Controle de versionamento de arquivos sensiveis

Comando executado:

```bash
git status --short --ignored dist/VFT-Studio-macOS.dmg .local/serial-keys.json
```

Resultado observado:

```text
!! .local/
!! dist/
```

Interpretacao:

- `.local/` esta ignorado e contem serial keys locais.
- `dist/` esta ignorado e contem artefatos de build.
- Esses arquivos nao devem ser enviados ao GitHub.

## 8. Evidencias pendentes recomendadas

Para completar o dossie visual, recomenda-se produzir e arquivar na pasta `evidencias/`:

- Captura da tela de ativacao por serial key.
- Captura da tela principal apos ativacao.
- Captura de um projeto VFT sem dados sensiveis.
- Captura de exportacao de relatorio demonstrativo.
- Video curto de instalacao e primeira ativacao em macOS.
- Posteriormente, video de instalacao em Windows.

## 9. Hashes de integridade

Os hashes SHA-256 de artefatos locais relevantes foram registrados em:

`evidencias/SHA256SUMS.txt`
