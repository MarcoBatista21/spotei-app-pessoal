import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { servicos } from "@/services/servicos";
import { useSessao } from "@/stores/useSessao";
import { useAcao } from "@/hooks/usePublicacoes";
import { FotoCarro } from "@/components/FotoCarro";
import { Campo } from "@/components/Campo";
import { Estado } from "@/components/Estado";
import { Botao } from "@/components/Botao";
import { Filtros } from "@/components/Filtros";
import { Confirmacao } from "@/components/Confirmacao";
import { Raridade as SeloRaridade } from "@/components/Raridade";
import { nomesRaridade } from "@/utils/pontuacao";
import { estilos } from "@/utils/tema";
import type { Publicacao, Carro, Moderador, Raridade } from "@/types/spot";
function Revisao({ publicacao }: { publicacao: Publicacao }) {
  const [marca, definirMarca] = useState(publicacao.carro.marca);
  const [modelo, definirModelo] = useState(publicacao.carro.modelo);
  const [versao, definirVersao] = useState(publicacao.carro.versao ?? "");
  const moderar = useAcao(async (aprovado: boolean) => {
    if (aprovado && (!marca.trim() || !modelo.trim()))
      throw new Error("Informe a marca e o modelo antes de aprovar.");
    await servicos.moderar(
      publicacao.id,
      aprovado,
      aprovado ? marca : undefined,
      aprovado ? modelo : undefined,
      aprovado ? versao : undefined,
    );
  });
  return (
    <View style={estilos.card}>
      <FotoCarro
        foto={publicacao.foto}
        style={{ width: "100%", aspectRatio: 1.5, borderRadius: 12 }}
      />
      <Text style={estilos.subtitulo}>@{publicacao.autor.usuario}</Text>
      <SeloRaridade valor={publicacao.carro.raridade} />
      <Campo
        titulo="Marca"
        value={marca}
        onChangeText={definirMarca}
        maxLength={60}
      />
      <Campo
        titulo="Modelo"
        value={modelo}
        onChangeText={definirModelo}
        maxLength={80}
      />
      <Campo
        titulo="Versão"
        value={versao}
        onChangeText={definirVersao}
        maxLength={80}
      />
      <Text style={estilos.secundario}>{publicacao.carro.justificativa}</Text>
      <View style={estilos.linha}>
        <View style={{ flex: 1 }}>
          <Botao
            titulo="Aprovar"
            onPress={() => moderar.mutate(true)}
            carregando={moderar.isPending}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Botao
            titulo="Rejeitar"
            onPress={() => moderar.mutate(false)}
            secundario
            desabilitado={moderar.isPending}
          />
        </View>
      </View>
      <Estado erro={moderar.error} />
    </View>
  );
}
function EditarCatalogo({ carro }: { carro: Carro }) {
  const [raridade, definirRaridade] = useState(carro.raridade);
  const salvar = useAcao((valor: Raridade) =>
    servicos.editarRaridade(carro.id, valor),
  );
  return (
    <View style={estilos.card}>
      <Text style={estilos.texto}>
        {carro.marca} {carro.modelo} {carro.versao ?? ""}
      </Text>
      <Filtros
        opcoes={Object.entries(nomesRaridade).map(([valor, titulo]) => ({
          valor,
          titulo,
        }))}
        valor={raridade}
        selecionar={(valor) => {
          definirRaridade(valor as Raridade);
          salvar.reset();
        }}
      />
      <Botao
        titulo="Salvar raridade"
        onPress={() => salvar.mutate(raridade)}
        carregando={salvar.isPending}
        desabilitado={raridade === carro.raridade}
        secundario
      />
      <Estado erro={salvar.error} />
      {salvar.isSuccess && (
        <Text accessibilityLiveRegion="polite" style={estilos.destaque}>
          Raridade salva.
        </Text>
      )}
    </View>
  );
}
export default function Moderacao() {
  const admin = useSessao((s) => s.perfil?.administrador);
  const perfilId = useSessao((s) => s.perfil?.id);
  const [aba, definirAba] = useState("pendentes");
  const [emailModerador, definirEmailModerador] = useState("");
  const [moderadorRemover, definirModeradorRemover] =
    useState<Moderador | null>(null);
  const [registroInvalidar, definirRegistroInvalidar] = useState<string | null>(
    null,
  );
  const consulta = useQuery({
    queryKey: ["moderacao"],
    queryFn: () => servicos.moderacao(),
    enabled: !!admin,
  });
  const invalidar = useAcao(async (id: string) => {
    await servicos.moderar(id, false);
    definirRegistroInvalidar(null);
  });
  const arquivar = useAcao((id: string) => servicos.resolverDenuncia(id));
  const moderadores = useQuery({
    queryKey: ["moderadores"],
    queryFn: () => servicos.moderadores(),
    enabled: !!admin && aba === "moderadores",
  });
  const gerenciarModerador = useAcao(
    (dados: { email: string; promover: boolean }) =>
      servicos.gerenciarModerador(dados.email, dados.promover),
  );
  if (!admin)
    return (
      <View style={estilos.conteudo}>
        <Estado vazio="Acesso restrito à moderação." />
        <Botao
          titulo="Voltar ao início"
          onPress={() => router.replace("/feed")}
          secundario
        />
      </View>
    );
  return (
    <KeyboardAvoidingView style={estilos.tela} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text style={estilos.titulo}>Uma comunidade justa.</Text>
      <Text style={estilos.secundario}>
        Confirme a identificação e a raridade antes de aprovar pontos.
      </Text>
      <Filtros
        valor={aba}
        selecionar={definirAba}
        opcoes={[
          { valor: "pendentes", titulo: "Pendentes" },
          { valor: "denuncias", titulo: "Denúncias" },
          { valor: "catalogo", titulo: "Catálogo" },
          { valor: "historico", titulo: "Pontos" },
          { valor: "moderadores", titulo: "Moderadores" },
        ]}
      />
      <Estado
        carregando={consulta.isLoading}
        erro={consulta.error ?? arquivar.error}
        repetir={() => void consulta.refetch()}
      />
      {aba === "pendentes" && (
        <>
          {consulta.data?.pendentes.map((p) => (
            <Revisao key={p.id} publicacao={p} />
          ))}
          {consulta.data && !consulta.data.pendentes.length && (
            <Estado vazio="Nenhum registro pendente." />
          )}
        </>
      )}
      {aba === "denuncias" && (
        <>
          {consulta.data?.denuncias.map((d) => (
            <View key={d.id} style={estilos.card}>
              <Text style={estilos.texto}>{d.motivo}</Text>
              <Botao
                titulo="Ver publicação"
                onPress={() =>
                  router.push({
                    pathname: "/publicacao/[id]",
                    params: { id: d.publicacaoId },
                  })
                }
                secundario
              />
              <Botao
                titulo={
                  d.estadoPublicacao === "rejeitado"
                    ? "Registro invalidado"
                    : "Invalidar registro"
                }
                onPress={() => {
                  invalidar.reset();
                  definirRegistroInvalidar(d.publicacaoId);
                }}
                desabilitado={
                  d.estadoPublicacao === "rejeitado" || invalidar.isPending
                }
              />
              <Botao
                titulo="Arquivar denúncia"
                onPress={() => arquivar.mutate(d.id)}
                carregando={arquivar.isPending}
                secundario
              />
            </View>
          ))}
          {consulta.data && !consulta.data.denuncias.length && (
            <Estado vazio="Nenhuma denúncia recebida." />
          )}
        </>
      )}
      <Confirmacao
        aberta={!!registroInvalidar}
        titulo="Invalidar este registro?"
        texto="A publicação será rejeitada e seus pontos serão recalculados."
        confirmar={() =>
          registroInvalidar && invalidar.mutate(registroInvalidar)
        }
        cancelar={() => definirRegistroInvalidar(null)}
        carregando={invalidar.isPending}
        erro={invalidar.error}
      />
      {aba === "catalogo" &&
        consulta.data?.catalogo.map((c) => (
          <EditarCatalogo key={c.id} carro={c} />
        ))}
      {aba === "historico" && (
        <>
          {consulta.data?.movimentos.map((m) => (
            <View key={m.id} style={estilos.card}>
              <Text style={[estilos.subtitulo, estilos.destaque]}>
                {m.pontos > 0 ? "+" : ""}
                {m.pontos} pontos
              </Text>
              <Text style={estilos.texto}>{m.motivo}</Text>
              <Text style={estilos.secundario}>
                {m.usuarioId} · {new Date(m.criadoEm).toLocaleString("pt-BR")}
              </Text>
            </View>
          ))}
          {consulta.data && !consulta.data.movimentos.length && (
            <Estado vazio="Nenhuma movimentação após os dados iniciais." />
          )}
        </>
      )}
      {aba === "moderadores" && (
        <>
          <View style={estilos.card}>
            <Text style={estilos.subtitulo}>Adicionar moderador</Text>
            <Text style={estilos.secundario}>
              A pessoa precisa ter uma conta cadastrada no Spotei.
            </Text>
            <Campo
              titulo="E-mail da conta"
              value={emailModerador}
              onChangeText={definirEmailModerador}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Botao
              titulo="Conceder moderação"
              onPress={() =>
                gerenciarModerador.mutate({
                  email: emailModerador,
                  promover: true,
                })
              }
              carregando={gerenciarModerador.isPending}
              desabilitado={!emailModerador.trim()}
            />
            <Estado erro={gerenciarModerador.error} />
          </View>
          <Estado
            carregando={moderadores.isLoading}
            erro={moderadores.error}
            repetir={() => void moderadores.refetch()}
          />
          {moderadores.data?.map((moderador) => (
            <View key={moderador.id} style={estilos.card}>
              <Text style={estilos.texto}>
                {moderador.nome} (@{moderador.usuario})
              </Text>
              <Text style={estilos.secundario}>{moderador.email}</Text>
              <Botao
                titulo={
                  moderador.id === perfilId
                    ? "Sua conta"
                    : "Remover moderação"
                }
                onPress={() => definirModeradorRemover(moderador)}
                desabilitado={moderador.id === perfilId}
                secundario
              />
            </View>
          ))}
          {moderadores.data?.length === 0 && (
            <Estado vazio="Nenhum moderador cadastrado." />
          )}
          <Confirmacao
            aberta={!!moderadorRemover}
            titulo="Remover acesso de moderador?"
            texto={`@${moderadorRemover?.usuario} perderá acesso às ferramentas de moderação.`}
            confirmar={() => {
              if (!moderadorRemover) return;
              gerenciarModerador.mutate({
                email: moderadorRemover.email,
                promover: false,
              });
              definirModeradorRemover(null);
            }}
            cancelar={() => definirModeradorRemover(null)}
            carregando={gerenciarModerador.isPending}
            erro={gerenciarModerador.error}
          />
        </>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
