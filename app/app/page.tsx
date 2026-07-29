import { permanentRedirect } from "next/navigation";

export default function AppIndex() {
  permanentRedirect("/app/dreams");
}
