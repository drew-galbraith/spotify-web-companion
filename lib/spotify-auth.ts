import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

async function saveUserToFirestore(spotifyUser: any) {
  const { id, display_name, email, images } = spotifyUser;

  const userDoc = doc(db, "users", id);
  await setDoc(userDoc, {
    spotify_id: id,
    display_name,
    email,
    avatar_url: images?.[0]?.url ?? null,
  });
}
