-- Create education articles table
create table if not exists education_articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  summary text not null,
  body text not null,
  source_name text,
  source_url text,
  published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for education_articles
alter table education_articles enable row level security;

-- Policy: everyone can read published articles
create policy "Published articles are viewable by everyone"
  on education_articles for select
  using (published = true);

-- Create index for better performance
create index education_articles_category_idx on education_articles (category);
create index education_articles_published_idx on education_articles (published);

-- Trigger for updated_at
create trigger update_education_articles_updated_at
  before update on education_articles
  for each row execute function update_updated_at_column();

-- Seed data
insert into education_articles (title, category, summary, body, source_name, source_url, published) values
(
  'Apa itu PCOS?',
  'apa_itu_pcos',
  'Pengenalan singkat tentang sindrom ovarium polikistik (PCOS).',
  E'## Apa itu PCOS?\n\nPCOS (*polycystic ovary syndrome*) adalah kondisi hormonal yang memengaruhi sebagian perempuan usia reproduksi.\n\n- Siklus haid bisa tidak teratur\n- Bisa disertai jerawat atau pertumbuhan rambut berlebih\n\n**Penting:** hanya tenaga medis yang dapat mendiagnosis PCOS.',
  'WHO',
  'https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome',
  true
),
(
  'Kapan sebaiknya ke dokter?',
  'kapan_ke_dokter',
  'Tanda-tanda yang sebaiknya diperiksakan ke tenaga medis.',
  E'## Kapan ke dokter?\n\nPeriksakan ke dokter jika kamu mengalami:\n\n- Haid yang sangat tidak teratur atau berhenti beberapa bulan\n- Nyeri yang mengganggu aktivitas sehari-hari\n- Keluhan yang terus memburuk\n\nDokter akan menentukan pemeriksaan yang tepat untukmu.',
  'WHO',
  'https://www.who.int/news-room/fact-sheets/detail/polycystic-ovary-syndrome',
  true
);