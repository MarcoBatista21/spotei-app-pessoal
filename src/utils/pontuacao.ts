import type { Publicacao, Raridade } from "../types/spot";

export const pontosRaridade: Record<Raridade, number> = {
  comum: 10,
  incomum: 30,
  raro: 80,
  epico: 200,
  lendario: 500,
};
export const nomesRaridade: Record<Raridade, string> = {
  comum: "Comum",
  incomum: "Incomum",
  raro: "Raro",
  epico: "Épico",
  lendario: "Lendário",
};
export function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
export function chaveCarro(carro: {
  marca: string;
  modelo: string;
  versao: string | null;
  geracao?: string | null;
}) {
  return [carro.marca, carro.modelo, carro.geracao ?? "", carro.versao ?? ""]
    .map(normalizar)
    .join("|");
}
// Cada nível exige mais 300 pontos; a barra mostra o progresso dentro do nível.
export function calcularNivel(pontos: number) {
  const nivel = Math.floor(Math.max(0, pontos) / 300) + 1;
  return {
    nivel,
    progresso: (Math.max(0, pontos) % 300) / 300,
    proximaMeta: nivel * 300,
  };
}
export function obterGaragem(publicacoes: Publicacao[], usuarioId: string) {
  const carros = new Map<string, Publicacao>();
  for (const publicacao of [...publicacoes].sort((a, b) =>
    a.criadoEm.localeCompare(b.criadoEm),
  )) {
    if (
      publicacao.autorId === usuarioId &&
      publicacao.estado === "aprovado" &&
      !carros.has(chaveCarro(publicacao.carro))
    ) {
      carros.set(chaveCarro(publicacao.carro), publicacao);
    }
  }
  return [...carros.values()];
}
export function obterConquistas(publicacoes: Publicacao[], usuarioId: string) {
  const garagem = obterGaragem(publicacoes, usuarioId);
  const aprovados = publicacoes.filter(
    (p) => p.autorId === usuarioId && p.estado === "aprovado",
  );
  const pontos = aprovados.reduce((total, p) => total + p.pontos, 0);
  return [
    {
      nome: "Primeiro Spot",
      descricao: "1 spot aprovado",
      obtida: aprovados.length >= 1,
    },
    {
      nome: "Caçador de Raros",
      descricao: "5 carros raros diferentes",
      obtida: garagem.filter((p) => p.carro.raridade === "raro").length >= 5,
    },
    {
      nome: "Colecionador",
      descricao: "20 modelos diferentes",
      obtida: garagem.length >= 20,
    },
    {
      nome: "Lenda das Ruas",
      descricao: "1 lendário aprovado",
      obtida: garagem.some((p) => p.carro.raridade === "lendario"),
    },
    {
      nome: "Especialista Porsche",
      descricao: "5 modelos Porsche",
      obtida:
        garagem.filter((p) => normalizar(p.carro.marca) === "porsche").length >=
        5,
    },
    {
      nome: "Explorador",
      descricao: "50 spots aprovados",
      obtida: aprovados.length >= 50,
    },
    { nome: "Caçador de Incomuns", descricao: "5 carros incomuns diferentes", obtida: garagem.filter((p) => p.carro.raridade === "incomum").length >= 5 },
    { nome: "Caçador de Épicos", descricao: "3 carros épicos diferentes", obtida: garagem.filter((p) => p.carro.raridade === "epico").length >= 3 },
    { nome: "Coleção Lendária", descricao: "3 carros lendários diferentes", obtida: garagem.filter((p) => p.carro.raridade === "lendario").length >= 3 },
    { nome: "Vitrine", descricao: "10 carros diferentes", obtida: garagem.length >= 10 },
    { nome: "Garagem de Ouro", descricao: "50 carros diferentes", obtida: garagem.length >= 50 },
    { nome: "Garagem de Elite", descricao: "100 carros diferentes", obtida: garagem.length >= 100 },
    { nome: "Veterano", descricao: "100 spots aprovados", obtida: aprovados.length >= 100 },
    { nome: "Lenda Urbana", descricao: "250 spots aprovados", obtida: aprovados.length >= 250 },
    { nome: "Mestre das Ruas", descricao: "500 spots aprovados", obtida: aprovados.length >= 500 },
    { nome: "XP 1.000", descricao: "Acumule 1.000 pontos de XP", obtida: pontos >= 1_000 },
    { nome: "XP 5.000", descricao: "Acumule 5.000 pontos de XP", obtida: pontos >= 5_000 },
    { nome: "XP 10.000", descricao: "Acumule 10.000 pontos de XP", obtida: pontos >= 10_000 },
    { nome: "XP 25.000", descricao: "Acumule 25.000 pontos de XP", obtida: pontos >= 25_000 },
    { nome: "XP 50.000", descricao: "Acumule 50.000 pontos de XP", obtida: pontos >= 50_000 },
  ];
}

export function numeroRomano(numero: number) {
  const valores: [number, string][] = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let restante = numero;
  let romano = "";
  for (const [valor, simbolo] of valores) while (restante >= valor) { romano += simbolo; restante -= valor; }
  return romano;
}
