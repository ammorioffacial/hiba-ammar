import { RoomClient } from "./RoomClient";


export default async function PlayRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomClient code={code} />;
}
