import { Redirect } from 'expo-router';

/** A rota "/" caiu junto com o Início antigo; a primeira aba agora é a Carteira. */
export default function Index() {
  return <Redirect href="/carteira" />;
}
