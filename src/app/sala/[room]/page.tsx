import RoomClient from "./room-client";

export default async function SalaPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  return <RoomClient room={decodeURIComponent(room)} />;
}
