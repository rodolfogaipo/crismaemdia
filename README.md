# Crisma em Dia

Aplicativo web (PWA) para controle completo dos encontros de Crisma — 100% offline, com dados salvos apenas no aparelho.

## Funcionalidades
- Cadastro de crismandos (nome, turma, observações)
- Controle de presença e faltas por encontro, com histórico individual e ranking de frequência
- Roteiro do encontro com modo Leitura (para usar durante o encontro) e modo Edição por blocos (título, subtítulo, tópico, destaque, texto)
- Banco de dinâmicas/atividades, vinculáveis a cada encontro
- Busca de temas já trabalhados
- Anotações gerais e por encontro
- Exportação em PDF e Word (.doc) do roteiro, da chamada, das dinâmicas, do encontro completo e do relatório de frequência
- Avisos automáticos na tela inicial quando um encontro cadastrado está próximo
- Backup manual dos dados em .json (exportar/importar)

## Como publicar no GitHub Pages
1. Crie um repositório novo no GitHub (ex.: `crisma-em-dia`).
2. Faça upload de **todos** os arquivos e pastas deste projeto (mantendo a estrutura de pastas `css/`, `js/`, `assets/`) — pode ser feito por arrastar e soltar na página do repositório no GitHub.
3. Vá em **Settings → Pages**.
4. Em "Source", selecione a branch `main` e a pasta `/ (root)`.
5. Salve. Em alguns minutos o app estará disponível em `https://SEU-USUARIO.github.io/crisma-em-dia/`.
6. Abra o link no celular e use "Adicionar à tela inicial" para instalar como aplicativo — depois disso ele funciona 100% offline.

## Observações técnicas
- Todos os dados ficam salvos no `localStorage` do navegador, apenas no aparelho onde o app foi aberto. Use a tela **Mais → Backup dos dados** regularmente para não perder informações caso troque de aparelho ou limpe os dados do navegador.
- Não há nenhum servidor, banco de dados externo ou coleta de dados — tudo roda localmente.
