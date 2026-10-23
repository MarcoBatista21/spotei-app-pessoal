import { useEffect, useRef, useState } from "react";
import { Platform, ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { useURL } from "expo-linking";
import { apiAuth } from "@/utils/api";
import { useSessao } from "@/stores/useSessao";
import { supabase } from "@/services/supabase";
import { Botao } from "@/components/Botao";
import { estilos } from "@/utils/tema";
import type { Sessao } from "@/types/spot";

type EstadoConfirmacao = "aguardando" | "confirmado" | "erro";

function obterParametros(url: string) {
  const fragmento = url.split("#")[1] ?? "";
  const consulta = url.split("?")[1]?.split("#")[0] ?? "";
  return new URLSearchParams(fragmento || consulta);
}

export default function ConfirmarEmail() {
  const urlRecebida = useURL();
  const processada = useRef("");
  const [erroSessao, definirErroSessao] = useState("");
  const url =
    Platform.OS === "web" && typeof window !== "undefined"
      ? window.location.href
      : (urlRecebida ?? "");
  const parametrosTela = obterParametros(url);
  const erroRetorno = parametrosTela.get("error_description") ?? "";
  const temTokens = !!parametrosTela.get("access_token") && !!parametrosTela.get("refresh_token");
  const estado: EstadoConfirmacao = erroRetorno || erroSessao
    ? "erro"
    : temTokens || !url
      ? "aguardando"
      : "confirmado";
  const mensagem = erroRetorno || erroSessao || (estado === "confirmado"
    ? "Link aberto. Se o Supabase confirmou seu e-mail, entre com seu e-mail e senha."
    : "Aguarde enquanto verificamos o retorno do e-mail.");

  useEffect(() => {
    if (!url || processada.current === url) return;
    processada.current = url;

    const parametros = obterParametros(url);
    const erro = parametros.get("error_description");
    if (erro) return;

    const accessToken = parametros.get("access_token");
    const refreshToken = parametros.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    void (async () => {
      try {
        const { data: usuario } = await apiAuth.get<{ id: string }>("/user", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const sessao: Sessao = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at:
            Math.floor(Date.now() / 1000) +
            Number(parametros.get("expires_in") || 3600),
          user: { id: usuario.id },
        };
        useSessao.getState().atualizarSessao(sessao);
        const perfil = await supabase.perfil(usuario.id);
        useSessao.getState().entrar(perfil, sessao);
        router.replace("/feed");
      } catch {
        definirErroSessao(
          "O e-mail foi aberto, mas não conseguimos iniciar sua sessão. Tente entrar com seu e-mail e senha.",
        );
      }
    })();
  }, [url]);

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Text style={estilos.titulo}>
        {estado === "aguardando"
          ? "Confirmando seu e-mail"
          : estado === "confirmado"
            ? "E-mail verificado"
            : "Não foi possível entrar"}
      </Text>
      <Text style={estilos.texto}>{mensagem}</Text>
      <Botao
        titulo="Ir para o login"
        onPress={() => router.replace("/entrar")}
      />
    </ScrollView>
  );
}
