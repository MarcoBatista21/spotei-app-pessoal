import { modoDemo, usaGeminiLocal } from "@/utils/configuracao";
import { analisarComGemini } from "./gemini";
import { demo } from "./demo";
import { supabase } from "./supabase";
import { lerLocal, salvarLocal } from "@/db/database";
import type { Perfil, Publicacao } from "@/types/spot";
import { useSessao } from "@/stores/useSessao";
import { isAxiosError } from "axios";
import { consultas } from "@/utils/consulta";

const provedor = modoDemo ? demo : supabase;
async function comCache<T>(
  chave: string,
  carregar: () => Promise<T>,
): Promise<T> {
  const chaveCache = `${modoDemo ? "demo" : "real"}-${useSessao.getState().perfil?.id}-${chave}`;
  try {
    const dados = await carregar();
    await salvarLocal(chaveCache, dados);
    return dados;
  } catch (erro) {
    if (isAxiosError(erro) && !erro.response) {
      const cache = await lerLocal<T>(chaveCache);
      if (cache) return cache;
    }
    throw erro;
  }
}
export const servicos = {
  ...provedor,
  analisar: (cenario: string, foto: string, hash: string) =>
    usaGeminiLocal
      ? analisarComGemini(foto)
      : provedor.analisar(cenario, foto, hash),
  perfil: (id: string) => comCache(`perfil-${id}`, () => provedor.perfil(id)),
  publicacao: (id: string) =>
    comCache(`publicacao-${id}`, () => provedor.publicacao(id)),
  perfis: () => comCache("perfis", () => provedor.perfis()),
  tagsTemporada: (id: string) =>
    modoDemo ? Promise.resolve([] as { season: number; colocacao: number }[]) : supabase.tagsTemporada(id),
  seguindo: () => comCache("seguindo", () => provedor.seguindo()),
  comentarios: (id: string) =>
    comCache(`comentarios-${id}`, () => provedor.comentarios(id)),
  raridades: () => comCache("raridades", () => provedor.raridades()),
  async sair() {
    try {
      await provedor.sair();
    } finally {
      useSessao.getState().sair();
      consultas.clear();
    }
  },
};
export async function obterPaginaFeed(pagina: number) {
  const chave = `feed-${modoDemo ? "demo" : "real"}-${useSessao.getState().perfil?.id}-${pagina}`;
  try {
    const lista = modoDemo
      ? (await demo.feed()).slice(pagina * 12, pagina * 12 + 12)
      : await supabase.paginaFeed(pagina);
    await salvarLocal(chave, lista);
    return lista;
  } catch (erro) {
    if (isAxiosError(erro) && !erro.response) {
      const cache = await lerLocal<Publicacao[]>(chave);
      if (cache) return cache;
    }
    throw erro;
  }
}
export async function obterPublicacoesPerfil(id: string) {
  const chave = `perfil-spots-${modoDemo ? "demo" : "real"}-${useSessao.getState().perfil?.id}-${id}`;
  try {
    const lista = modoDemo
      ? await demo.publicacoesPerfil(id)
      : await supabase.publicacoesPerfil(id);
    await salvarLocal(chave, lista);
    return lista;
  } catch (erro) {
    if (isAxiosError(erro) && !erro.response) {
      const cache = await lerLocal<Publicacao[]>(chave);
      if (cache) return cache;
    }
    throw erro;
  }
}
export async function obterRanking(
  periodo: string,
  cidade: string,
): Promise<Perfil[]> {
  if (!modoDemo)
    return comCache(`ranking-${periodo}-${cidade}`, () =>
      supabase.ranking(periodo, cidade),
    );
  const perfis = await demo.perfis();
  const publicacoes = await demo.feed();
  const agora = new Date();
  const mesesDesdeInicio = (agora.getFullYear() - 2026) * 12 + agora.getMonth() - 10;
  const numeroSeason = mesesDesdeInicio >= 0 ? Math.floor(mesesDesdeInicio / 3) : -1;
  const inicioSeason = numeroSeason >= 0 ? new Date(2026, 10 + numeroSeason * 3, 1) : null;
  const fimSeason = inicioSeason ? new Date(inicioSeason.getFullYear(), inicioSeason.getMonth() + 3, 1) : null;
  const dias = periodo === "semanal" ? 7 : periodo === "mensal" ? 30 : Infinity;
  return perfis
    .map((perfil) => ({
      ...perfil,
      pontos: publicacoes
        .filter(
          (p) =>
            p.autorId === perfil.id &&
            p.estado === "aprovado" &&
            (periodo === "geral" || (periodo === "season"
              ? !!inicioSeason && !!fimSeason && Date.parse(p.criadoEm) >= inicioSeason.getTime() && Date.parse(p.criadoEm) < fimSeason.getTime()
              : Date.parse(p.criadoEm) >= Date.now() - dias * 86400000)),
        )
        .reduce((total, p) => total + p.pontos, 0),
    }))
    .filter(
      (p) => !cidade || p.cidade.toLowerCase().includes(cidade.toLowerCase()),
    )
    .sort((a, b) => b.pontos - a.pontos || a.usuario.localeCompare(b.usuario));
}
