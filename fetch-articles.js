import 'dotenv/config';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const parser = new Parser();

const MAX_ARTICLES = 300;

// Mots-clés : au moins un doit apparaître dans titre ou résumé pour les sources généralistes
const MOTS_CLES = [
  'formation professionnelle', 'formation continue', 'organisme de formation',
  'cpf', 'compte personnel de formation',
  'qualiopi', 'certification', 'certif', 'habilitation',
  'apprentissage', 'alternance', 'contrat de professionnalisation',
  'compétences', 'plan de développement',
  'création d\'entreprise', 'créer son entreprise', 'créateur', 'porteur de projet',
  'entrepreneuriat', 'entrepreneur', 'auto-entrepreneur', 'autoentrepreneur',
  'micro-entreprise', 'reprise d\'entreprise',
  'financement de la formation', 'opco', 'dreets', 'france travail',
  'vae', 'validation des acquis', 'bilan de compétences',
  'e-learning', 'digital learning', 'formation à distance', 'foad',
  'ingénierie pédagogique', 'ingénierie de formation',
];

// Sources généralistes qui nécessitent un filtre par mots-clés
const SOURCES_A_FILTRER = new Set([
  'Le Café Pédagogique',
  'Thot Cursus — Éducation & Formation',
  'Création Entreprise',
  'France Active',
  'C2RP / Emfor BFC',
  'LearnAssembly — Formation & IA',
]);

function estPertinent(article) {
  const texte = `${article.titre} ${article.resume || ''}`.toLowerCase();
  return MOTS_CLES.some(mot => texte.includes(mot));
}

const SOURCES = [
  // Formation professionnelle & CPF
  {
    name: 'Via Compétences — Emploi & Formation',
    url: 'https://www.via-competences.fr/rss-actualites.xml',
  },
  {
    name: 'C2RP / Emfor BFC',
    url: 'https://www.c2rp.fr/rss.xml',
  },
  // Qualiopi & certification
  {
    name: 'Activ Cert — Qualiopi & Certification',
    url: 'https://activcert.fr/feed',
  },
  // Entrepreneuriat & création d'entreprise
  {
    name: 'Création Entreprise',
    url: 'https://www.creation-entreprise.fr/feed',
  },
  {
    name: 'France Active',
    url: 'https://www.franceactive.org/feed',
  },
  // Digital learning & pédagogie
  {
    name: 'Digiformag — Formation digitale',
    url: 'https://www.digiformag.com/feed',
  },
  {
    name: 'Thot Cursus — Éducation & Formation',
    url: 'https://cursus.edu/feed',
  },
  {
    name: 'Sydologie — Innovation pédagogique',
    url: 'https://sydologie.com/feed',
  },
  {
    name: 'Le Café Pédagogique',
    url: 'https://www.cafepedagogique.net/feed',
  },
  {
    name: 'LearnAssembly — Formation & IA',
    url: 'https://learnassembly.com/feed',
  },
  {
    name: "L'Atelier du Formateur",
    url: 'https://latelierduformateur.fr/feed',
  },
];

async function trimOldArticles() {
  const { count } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true });

  if (!count || count <= MAX_ARTICLES) return;

  const excess = count - MAX_ARTICLES;
  console.log(`Base à ${count} articles, suppression des ${excess} plus anciens...`);

  const { data: oldest } = await supabase
    .from('articles')
    .select('id')
    .order('date_ajout', { ascending: true })
    .limit(excess);

  if (oldest?.length) {
    const ids = oldest.map(a => a.id);
    await supabase.from('articles').delete().in('id', ids);
    console.log(`${ids.length} anciens articles supprimés.`);
  }
}

async function fetchAndStore() {
  let total = 0;
  let inseres = 0;

  for (const source of SOURCES) {
    console.log(`Fetching: ${source.name}`);
    try {
      const feed = await parser.parseURL(source.url);

      for (const item of feed.items) {
        total++;
        const article = {
          titre: item.title?.trim() || '(sans titre)',
          lien: item.link,
          source: source.name,
          date_publication: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          resume: item.contentSnippet?.substring(0, 500) || item.summary?.substring(0, 500) || null,
        };

        if (SOURCES_A_FILTRER.has(source.name) && !estPertinent(article)) {
          continue;
        }

        const { error } = await supabase
          .from('articles')
          .insert(article)
          .select();

        if (error) {
          if (error.code === '23505') {
            // doublon, ignoré
          } else {
            console.error(`Erreur insert (${source.name}):`, error.message);
          }
        } else {
          inseres++;
        }
      }
    } catch (err) {
      console.error(`Erreur fetch (${source.name}):`, err.message);
    }
  }

  console.log(`Terminé : ${inseres} nouveaux articles insérés sur ${total} récupérés.`);
  await trimOldArticles();
}

fetchAndStore();
