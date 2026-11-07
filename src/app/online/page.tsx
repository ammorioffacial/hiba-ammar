import { redirect } from "next/navigation";

// الأونلاين صار داخل الغرفة الموحدة
export default function OnlineRedirect() {
  redirect("/play");
}
