import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Cabecalho } from "@/components/Cabecalho";
import { Filtros } from "@/components/Filtros";
import { Campo } from "@/components/Campo";
import { Avatar } from "@/components/Avatar";
import { Estado } from "@/components/Estado";
import { obterRanking } from "@/services/servicos";
import { useSessao } from "@/stores/useSessao";
import { cores, estilos } from "@/utils/tema";
import { numeroRomano } from "@/utils/pontuacao";
export default function Ranking() {
  const [periodo, definirPeriodo] = useState("geral");
  const [cidade, definirCidade] = useState("");
  const id = useSessao((s) => s.perfil?.id);
  const agora = new Date();
  const mesesDesdeInicio = (agora.getFullYear() - 2026) * 12 + agora.getMonth() - 10;
  const season = mesesDesdeInicio >= 0 ? Math.floor(mesesDesdeInicio / 3) + 1 : null;
  const consulta = useQuery({
    queryKey: ["ranking", periodo, cidade],
    queryFn: () => obterRanking(periodo, cidade),
  });
  return (
    <View style={estilos.tela}>
      <Cabecalho titulo="Ranking" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={estilos.conteudo}>
        <View>
          <Text style={estilos.titulo}>Quem domina as ruas?</Text>
          <Text style={estilos.secundario}>
            Cada encontro aprovado conta. Cada coleção é única.
          </Text>
        </View>
        <Filtros
          valor={periodo}
          selecionar={definirPeriodo}
          opcoes={[
            { valor: "geral", titulo: "All time" },
            { valor: "season", titulo: season ? `Season ${numeroRomano(season)}` : "Season I" },
            { valor: "semanal", titulo: "Semana" },
            { valor: "mensal", titulo: "Mês" },
          ]}
        />
        <Campo
          titulo="Cidade ou região"
          value={cidade}
          onChangeText={definirCidade}
          placeholder="Todas as cidades"
        />
        {periodo === "season" && (
          <Text style={estilos.secundario}>
            {season ? `Season ${numeroRomano(season)} · termina em ${new Date(2026, 10 + (season - 1) * 3 + 3, 1).toLocaleDateString("pt-BR")}. Os 5 primeiros recebem uma tag no perfil.` : "A Season I começa em 1º de novembro de 2026 e dura três meses. Os 5 primeiros recebem uma tag no perfil."}
          </Text>
        )}
        <Estado
          carregando={consulta.isLoading}
          erro={consulta.error}
          repetir={() => void consulta.refetch()}
        />
        <View>
          {consulta.data?.map((perfil, indice) => (
            <TouchableOpacity
              key={perfil.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil de ${perfil.usuario}`}
              style={[
                estilos.linha,
                {
                  paddingVertical: 16,
                  paddingHorizontal: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: cores.borda,
                },
                perfil.id === id && {
                  backgroundColor: cores.superficie,
                  borderRadius: 10,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/usuario/[id]",
                  params: { id: perfil.id },
                })
              }
            >
              <Text
                style={[
                  estilos.subtitulo,
                  indice < 3 && estilos.destaque,
                  { width: 28 },
                ]}
              >
                {String(indice + 1).padStart(2, "0")}
              </Text>
              <Avatar nome={perfil.nome} foto={perfil.avatar} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={estilos.texto}>
                  {perfil.usuario}
                  {perfil.id === id ? " · você" : ""}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                  <Text numberOfLines={1} style={estilos.secundario}>{perfil.cidade || "Spotter"}</Text>
                  {perfil.administrador && <Text style={{ color: "#D6B5FF", backgroundColor: "#59318C", borderRadius: 8, paddingHorizontal: 7, fontSize: 11, overflow: "hidden" }}>Mod</Text>}
                </View>
              </View>
              <Text style={[estilos.subtitulo, estilos.destaque]}>
                {perfil.pontos}
                <Text style={estilos.secundario}> pts</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {!consulta.isLoading && !consulta.data?.length && (
          <Estado vazio="Nenhum spotter nessa região." />
        )}
        <Text style={estilos.secundario}>
          Curtidas e comentários não geram pontos. Registros em revisão aguardam
          aprovação.
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
