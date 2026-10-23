# Spotei — Car Spotting

Aplicativo React Native + Expo + TypeScript para Android, iOS e web. A estrutura usa telas em `src/app`, componentes simples, hooks, tipos, serviços com Axios, SQLite, AsyncStorage e stores Zustand. A interface usa `StyleSheet`, fundo escuro, ciano, magenta e roxo, com bordas arredondadas. Novo spot fica no ícone superior esquerdo e Explorar no direito; a barra inferior contém Início, Ranking e Perfil.

O perfil prioriza as fotos em uma grade de três colunas. Conquistas têm uma aba própria, e privacidade, moderação e saída ficam na engrenagem. Criar um spot segue três etapas: foto, identificação do carro e publicação. As opções da demonstração ficam recolhidas; câmera e galeria são os atalhos principais.

Após o scan, o nome e a raridade aparecem no centro e diminuem até se encaixar no topo. Só então entram a foto inteira, versão, ano, geração e características. A conferência usa um cabeçalho simples, sem abas, câmera, galeria ou avisos técnicos. “Editar” reúne as correções e a escolha entre carros da mesma foto; “Salvar e publicar” continua sendo a ação principal. Rascunhos retomados não repetem a revelação, e a preferência de movimento reduzido é respeitada.

A prévia usa o mesmo quadro do feed e dos detalhes da publicação. O ícone de duas setas alterna entre mostrar a foto inteira, com margens da cor do app, e preencher o quadro com recorte visual central. A escolha é salva no rascunho, na publicação e na fila offline; a imagem original e a análise da IA continuam inteiras. Publicações antigas sem configuração mostram a foto inteira por padrão. A grade do perfil continua usando miniaturas.

Os contadores de seguidores e seguindo abrem listas de perfis; o contador de spots leva à grade. Os três pontinhos abrem o menu da publicação, e o ícone de comentário leva ao campo de texto. Registros rejeitados continuam acessíveis ao autor e ao moderador. A moderação permite invalidar registros, arquivar denúncias mantendo o histórico e ajustar a raridade dos modelos identificados pela IA. A recuperação por e-mail aparece apenas no modo de conta online.

## Desenvolvimento local

Clone o repositório e instale as dependências:

```powershell
git clone git@github.com:MarcoBatista21/spotei-app-pessoal.git
cd spotei-app-pessoal
npm ci
```

Para testar sem chaves ou chamadas pagas, configure o `.env` com:

```dotenv
EXPO_PUBLIC_APP_MODE=demo
EXPO_PUBLIC_IA_MODE=simulada
```

Inicie o Expo:

```powershell
npx expo start --clear
```

Abra o QR code no Expo Go compatível com o SDK do projeto. O computador e o celular precisam se comunicar pela rede; se a rede local bloquear a conexão, tente `npx expo start --tunnel --clear`. Para abrir no navegador, use `npm run web`. No modo demo, contas, publicações e interações ficam locais em cada aparelho; os testadores não verão os dados uns dos outros.

## Build de teste para amigos (Android)

O perfil `preview` em `eas.json` gera um APK instalável e usa demo simulada. Assim, o app instalado não depende de manter o Expo aberto e não inclui uma chave Gemini. Faça login na sua conta Expo e configure o projeto EAS uma vez:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Depois gere e compartilhe a build:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Ao terminar, o EAS fornece um link para baixar e instalar o APK. Compartilhe esse link somente com os testadores. O Android pode pedir autorização para instalar aplicativos baixados fora da Play Store. O plano gratuito do EAS tem uma cota mensal limitada de builds; confira os [limites atuais](https://expo.dev/pricing).

Para criar um APK Android ligado ao Supabase e com análise Gemini real, use o perfil `preview-real`. Ele gera APK de distribuição interna e busca as variáveis públicas do ambiente `preview` do EAS. Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` na página **Project settings > Environment variables** do projeto Expo, ambiente `preview`. A chave publicável (ou `anon` legada) é feita para estar no cliente; nunca use `service_role` nem a chave Gemini no APK. Depois, gere a build com:

```powershell
npx eas-cli@latest build --platform android --profile preview-real
```

O APK só funcionará no modo real depois de configurar o projeto Supabase, aplicar as migrações e publicar a Edge Function. Veja **Habilitar Supabase e Gemini** abaixo. A build `preview` sem `-real` continua sendo a demonstração local.

O perfil `preview` usa `EXPO_PUBLIC_APP_MODE=demo` e `EXPO_PUBLIC_IA_MODE=simulada`. Para testar feed compartilhado ou análise Gemini real, configure o Supabase e publique a função de identificação conforme a seção abaixo; a rota local `src/app/api/analisar+api.ts` é apenas para desenvolvimento e não funciona como backend de um APK publicado. Nunca coloque `GEMINI_API_KEY` em `EXPO_PUBLIC_` nem envie `.env` ao GitHub.

A distribuição nativa para iPhone por TestFlight ou instalação ad hoc exige uma conta Apple Developer paga. Consulte os [requisitos e valores da Apple](https://developer.apple.com/programs/).

## Reconhecimento real com Gemini no Expo

Para usar Gemini durante o desenvolvimento local, copie `.env.example` para `.env`, preencha `GEMINI_API_KEY` e reinicie o Expo. As variáveis usadas são:

```dotenv
EXPO_PUBLIC_APP_MODE=demo
EXPO_PUBLIC_IA_MODE=gemini
GEMINI_API_KEY=SUA_CHAVE_PRIVADA
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.5-flash
```

Abra **Novo spot** e use **Fotografar** ou **Galeria**. O scan e a análise começam automaticamente. A imagem preparada é enviada por Axios para `src/app/api/analisar+api.ts`. Somente essa rota do servidor lê a chave e consulta o Google. O endereço é obtido do Expo, inclusive no celular; mantenha o computador ligado, o Expo aberto e os dois aparelhos na mesma rede. Não coloque a chave em nenhuma variável `EXPO_PUBLIC_`.

Falhas temporárias de conexão, tempo limite ou respostas 5xx permitem até três tentativas, com intervalos crescentes e prazo total de 50 segundos. `GEMINI_FALLBACK_MODEL` define o modelo de reserva; ele recebe a mesma foto se o principal falhar. Cota ou chave inválida não disparam tentativas adicionais. Pedidos simultâneos da mesma foto compartilham a análise em andamento. Alterações no `.env` exigem reiniciar o Expo; `GET /api/analisar` informa o modelo ativo sem expor a chave.

O resultado real informa marca, modelo, possível versão e uma estimativa de raridade. Campos desconhecidos ficam vazios. É possível corrigir o resultado, escolher um carro principal quando houver vários, escrever a legenda e publicar. Os registros identificados pela IA ficam em revisão, sem pontos antecipados, até a aprovação na moderação local.

Esse modo usa **IA real e dados sociais locais**. A rota de desenvolvimento fica desabilitada em produção e tem limite global de 5 análises por minuto e 50 por dia, além da cota da conta Google. Análises da mesma foto são reutilizadas em memória durante a execução do servidor. Não há troca silenciosa por resultado simulado se o Google falhar. Para um app distribuído sem o Expo aberto, configure o backend autenticado do Supabase descrito abaixo.

Para experimentar tudo sem chamadas ao Google, use `EXPO_PUBLIC_IA_MODE=simulada` e reinicie o Expo. Nesse modo, os cenários demonstrativos voltam a aparecer.

## O que funciona na demonstração

- Feed com fotografias incluídas no projeto, abas Last Spot (você e quem segue) e Global Spot (comunidade), atualização por gesto e páginas de 12 itens.
- Cadastro local, login, sessão persistente, logout, edição de nome, usuário, biografia, cidade e avatar.
- Curtir, descurtir, comentar, excluir comentários próprios, seguir e deixar de seguir.
- Fotografar, selecionar da galeria, preparar JPEG com limite de resolução, salvar rascunho e publicar.
- Análise real com `EXPO_PUBLIC_IA_MODE=gemini`, ou **explicitamente simulada** por cenário escolhido com `EXPO_PUBLIC_IA_MODE=simulada`.
- Garagem sem duplicação de modelo/geração/versão, filtros por marca e raridade, ordenação por data ou pontos.
- Ranking geral, semanal e mensal com filtro de cidade, níveis e conquistas.
- Denúncias, aprovação/rejeição, correção de identificação, edição de raridade e histórico de pontos na conta administrativa demonstrativa.

As fotografias são ilustrativas; versões e anos não confirmados permanecem desconhecidos. As raridades da demo são cenários didáticos, inclusive o Ferrari no cenário lendário. Isso não equivale a uma classificação histórica verificada. As contas demo e admin demo não são habilitadas em produção.

## Recursos principais

- Cadastro demonstrativo, login, perfil e interações sociais em armazenamento local.
- Publicação de fotos de carros, com análise simulada ou identificação real via Gemini/Supabase.
- Feed, busca, garagem, ranking, comentários, curtidas e moderação.
- Preenchimento opcional da cidade usando localização do aparelho. O app salva cidade e estado, não as coordenadas.
- Entrada biométrica opcional. As credenciais ficam no armazenamento seguro do aparelho.
- Fotos de posts exibidas em quadro quadrado; novas publicações preenchem o quadro por padrão e permitem alternar para a foto inteira.

## Arquivos principais

```text
src/
  app/                  telas e navegação Expo Router
  components/           botões, campos, fotos, cartões e cabeçalho
  db/                   SQLite e dados demonstrativos
  hooks/                TanStack Query e mutações
  services/             demo, Supabase e preparação de fotografias
  server/               consulta privada ao Gemini e tratamento de erros
  stores/               sessão e sincronização com Zustand
  types/                tipos em português
  utils/                Axios, fila, regras e cores
supabase/
  migrations/           banco, RLS e funções transacionais
  functions/identify-vehicle/  Gemini somente no backend
  seed.sql              catálogo inicial com estimativas identificadas
testes/                 regras, PostgreSQL e fluxo no navegador
```

Não foi alterado o projeto de referência. As telas compartilham componentes; as regras do modo real ficam no servidor. Os comentários explicam as decisões importantes, sem comentar cada linha.

## Habilitar Supabase e Gemini

1. Crie um projeto Supabase e uma chave Gemini na sua própria conta. Guarde o **Project reference** (identificador do projeto) e a URL do projeto.
2. No Dashboard do Supabase, em **Project Settings > API Keys**, copie a chave publicável (`sb_publishable_...`) ou, em projetos antigos, a chave `anon`. No Dashboard do Expo, em **Project settings > Environment variables**, crie no ambiente `preview` estas duas variáveis: `EXPO_PUBLIC_SUPABASE_URL` com a URL do Supabase e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com a chave publicável. Elas estarão incluídas no APK e podem ser vistas por quem o instalar; a segurança dos dados depende das políticas RLS e da chave publicável, nunca de esconder essa chave.
3. Para desenvolvimento local, copie `.env.example` para `.env`, preencha a mesma URL e chave pública e defina `EXPO_PUBLIC_APP_MODE=production`. Não copie a chave Gemini ou `service_role` para esse arquivo do app.
4. Aplique as migrações de `supabase/migrations` em ordem de data (`202610070001_spotei.sql`, `202610140001_denuncias.sql` e `202610200001_enquadramento.sql`). Elas criam as tabelas e regras, mas deixam `car_brands` e `car_catalog` vazias. **Não execute `supabase/seed.sql` nem use `--include-seed`** se quiser que o catálogo seja formado pelos carros identificados pela IA. Em um projeto vazio, use a CLI:

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

5. Copie `supabase/.env.example` para `supabase/.env` e preencha `GEMINI_API_KEY` e `GEMINI_MODEL`. Esse arquivo é apenas para a CLI e não deve ser enviado ao Git. O modelo é configurável; escolha um Flash multimodal que sua conta ofereça e que suporte resposta estruturada. Implante:

```powershell
npx supabase secrets set --env-file supabase/.env
npx supabase functions deploy identify-vehicle
```

6. Cadastre-se no app e confirme o e-mail. Para conceder o primeiro papel de moderador, execute no SQL Editor substituindo o endereço de exemplo pelo e-mail cadastrado:

```sql
insert into public.user_roles(usuario_id, administrador)
select id, true from auth.users where lower(email) = lower('EMAIL_CADASTRADO')
on conflict(usuario_id) do update set administrador = true;
```

7. No Supabase hospedado, o Site URL e Redirect URLs ja estao configurados para `spotei://confirmar-email` e `spotei://**`. A tela `confirmar-email` recebe o link no app. Para web, autorize a URL do site e `/confirmar-email` e `/redefinir-senha`. `EXPO_PUBLIC_RECOVERY_URL` permite definir um destino de recuperacao especifico. Configure o envio de e-mail do Supabase.
8. Para gerar o APK Android com backend real, use `npx eas-cli@latest build --platform android --profile preview-real`. Para desenvolvimento local, reinicie o Expo depois de editar `.env`: `npx expo start --clear`.

Depois que o primeiro moderador for definido, ele pode adicionar ou remover moderadores pela aba **Moderadores** da tela de moderação. A conta `marco.rosa.22@hotmail.com` ja esta promovida no projeto hospedado.
Nunca coloque Gemini ou a chave `service_role` em variáveis `EXPO_PUBLIC_`. A função obtém as credenciais de Supabase pelo ambiente do servidor. `verify_jwt=false` só desativa a checagem do gateway: a função **valida o token com Supabase Auth em cada chamada** antes de acessar a foto.

## Regras e segurança

- Pontos: comum 10, incomum 30, raro 80, épico 200, lendário 500. O modo real consulta `rarity_tiers` para mostrar os valores configurados no banco.
- O primeiro registro aprovado de cada combinação gera pontos. Fotos adicionais são permitidas, sem crédito repetido. Likes e comentários não pontuam.
- Épicos, lendários, correções e entradas provisórias passam por revisão antes de pontuar.
- A publicação usa uma RPC transacional com bloqueio por usuário, restrições únicas e ID idempotente. O cliente não possui permissão de escrita no saldo ou histórico.
- Excluir o primeiro registro transfere o crédito para o próximo registro aprovado do mesmo carro, se existir. Sem outro registro, o saldo é estornado. Invalidar ou alterar raridade também recalcula coleção e conquistas.
- RLS protege todas as tabelas. Fotos ficam em bucket privado e usam URLs temporárias; avatares são públicos. Operações administrativas verificam permissões no backend.
- A função verifica proprietário, JPEG e tamanho, calcula hash dos bytes, reutiliza análises e limita a 5 solicitações por minuto e 50 por dia.
- Gemini retorna JSON validado. Quando há vários carros, é possível selecionar o principal. Marca/modelo/versão podem ser corrigidos antes de publicar; os pontos não são editáveis.
- O catálogo inicial distingue estimativas de classificações verificadas. `verificado` indica aprovação editorial para uso; o campo `classificacao` registra o tipo de evidência. Nenhum número de fabricação foi inventado.
- `hash_perceptual` prepara a estrutura para detecção de semelhança; o algoritmo de semelhança visual ainda não está implementado.

## Offline e privacidade

A demo funciona sem internet com fotos do projeto e dados persistidos. No modo real, o app reabre dados já consultados quando a rede falha; fotos baixadas têm cache de disco. Rascunhos e cópias de fotos sobrevivem a reinicializações.

Reconhecimento real exige internet. Depois que uma identificação existe, uma publicação que falha por falta de rede entra na fila, aparece no perfil com zero pontos definitivos e é reenviada ao reconectar, ao voltar ao app ou ao tocar no ícone de nuvem. Erros de validação do servidor não são convertidos em publicações fictícias. A fila é separada por usuário. Curtidas, comentários, exclusões e edições reais exigem conexão.

Ao escolher uma foto, o app solicita acesso opcional à localização em primeiro plano para preencher a cidade do spot. Somente cidade e estado são salvos; as coordenadas não são armazenadas. Sem permissão ou sinal, a cidade do perfil e a edição manual continuam disponíveis. A preparação JPEG remove os metadados originais. A entrada biométrica é opcional e guarda credenciais no armazenamento seguro do aparelho. O editor de placas, solicitação automática de exclusão de conta e exportação completa de dados pessoais não foram implementados; a página de privacidade apresenta os controles disponíveis. Em produção, a exclusão do post remove o registro social; a limpeza dos arquivos órfãos do Storage precisa ser configurada como rotina administrativa.

## Marca e fotografias

`components/Logo.tsx` contém uma reprodução vetorial baseada na imagem enviada. O arquivo original da logo não apareceu entre os anexos acessíveis no sistema de arquivos; portanto a reprodução não é idêntica ao original. Para usar a arte original, coloque-a em `assets/logo.png` e substitua o conteúdo de `Logo.tsx` por um componente `Image` com `contentFit="contain"`.

As fotografias de demonstração são do Unsplash e foram incluídas no projeto para funcionar offline. Fontes: [Porsche](https://images.unsplash.com/photo-1503376780353-7e6692767b70), [BMW](https://images.unsplash.com/photo-1555215695-3004980ad54e), [Ferrari](https://images.unsplash.com/photo-1592198084033-aade902d1aae), [SUV Ford](https://images.unsplash.com/photo-1533473359331-0135ef1b58bf), [Fiat](https://images.unsplash.com/photo-1549317661-bd32c8ce0db2), [Mustang](https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd). São arquivos de apresentação, não conteúdo enviado por usuários reais.

## Testes e apresentação

Ao tirar uma foto ou selecionar na galeria, a análise começa automaticamente. A tela de scan mantém a foto inteira enquanto aguarda a IA. Em seguida, abre a conferência dos dados, com seleção de candidatos, correção da identificação, legenda e cidade. Só o botão **Salvar e publicar**, após a confirmação do usuário, cria o registro e atualiza perfil e feed. Cancelar o scan mantém um rascunho; falhas permitem tentar novamente sem publicar. As regras de moderação e pontuação continuam valendo.

Com o Expo aberto, `npm run test:publicacao` verifica esse fluxo completo, incluindo a animação, cancelamento, resposta atrasada, correções, persistência e foto no perfil/feed. `npm run test:enquadramento` verifica fotos horizontais e verticais com os quatro cantos preservados. Ambos usam respostas controladas e não consomem a cota do Gemini.

A galeria permite imagens sem exigir extensão JPEG. Os formatos que o aparelho consegue abrir são convertidos automaticamente para JPEG, preservando todo o enquadramento. No iOS, o seletor pede uma representação compatível e pode baixar a foto do iCloud. No envio local ao Gemini, o app transmite base64 em JSON para evitar diferenças de buffers binários entre web, Android e iOS. O servidor também reconhece JPEG, PNG, WebP, HEIC e HEIF pelo conteúdo real e usa o MIME correspondente, conforme os [formatos aceitos pelo Gemini](https://ai.google.dev/gemini-api/docs/image-understanding?hl=pt-br#supported-image-formats). Imagens corrompidas e formatos que o dispositivo não consegue decodificar ainda precisam ser substituídos pelo arquivo original; o app não promete abrir arquivos de edição ou RAW de qualquer câmera.

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
npx expo export --platform web
```

Para testar câmera/galeria pela interface com **chamadas reais ao Google**, deixe `npm start` rodando na porta 8081, instale o navegador de testes com `npx playwright install chromium` e execute `npm run test:ia`. Esse teste usa a cota da sua conta. Para repetir os fluxos sociais simulados, use `EXPO_PUBLIC_IA_MODE=simulada`, reinicie o Expo e execute `npm run test:fluxo`. Os testes criam um navegador isolado e salvam capturas em `qa/`.

`npm run test:auditoria` verifica cadastro/login, edição e foto de perfil, menus, curtidas, foco e exclusão de comentários, seguidores, busca, ranking, garagem, exclusão com confirmação, denúncias, aprovação/rejeição, catálogo, paginação, rascunho, recuperação de falhas e links inválidos. Esse roteiro usa dados isolados no navegador e respostas controladas da IA, sem consumir a cota do Gemini; o teste de IA real continua separado.

Foram validados TypeScript, lint, dependências Expo, compilação web/Android/iOS, regras da demo, esquema de resposta da IA e migração SQL executada em PostgreSQL via PGlite. Os testes do banco substituem apenas Auth/Storage por estruturas locais; não substituem as funções de pontuação. O fluxo no navegador também verificou seleção real de arquivo pela galeria, preparação JPEG, publicação pendente sem pontos antecipados e aprovação administrativa.

Nao foi possivel executar camera ou SQLite em um aparelho fisico neste ambiente. O botao Fotografar e exercitado no navegador por selecao de arquivo; no celular abre a camera nativa. As chamadas ao Gemini sao reais, e as credenciais e migracoes do Supabase estao configuradas no projeto hospedado; falta validar o fluxo final em aparelhos fisicos. As dependencias transitivas do SDK 57 possuem avisos no `npm audit`; nao foram aplicados os downgrades incompativeis sugeridos automaticamente.

Roteiro de apresentação: entrar na demo, publicar uma foto, mostrar validação e câmera/galeria, abrir garagem/ranking, desligar a internet e reabrir dados, explicar Zustand e SQLite, e usar uma conta Supabase de teste para demonstrar GET e mutações HTTP. Teste a permissão negada da câmera no celular antes de apresentar.
