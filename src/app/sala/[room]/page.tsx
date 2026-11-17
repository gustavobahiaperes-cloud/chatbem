import type { Metadata } from "next";
import RoomClient from "./room-client";

type Props = { params: Promise<{ room: string }> };

// Título da aba com o nome da sala. A tela da chamada acrescenta o número de
// mensagens novas na frente, ex.: "(3) dota+ · Chatbem".
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { room } = await params;
  return { title: `${decodeURIComponent(room)} · Chatbem` };
}

export default async function SalaPage({ params }: Props) {
  const { room } = await params;
  return <RoomClient room={decodeURIComponent(room)} />;
}
