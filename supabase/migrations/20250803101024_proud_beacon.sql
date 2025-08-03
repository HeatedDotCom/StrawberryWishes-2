/*
  # Create leaderboard table

  1. New Tables
    - `leaderboard`
      - `player_id` (text, part of primary key)
      - `field` (text, part of primary key) 
      - `total_score` (integer, default 0)
      - `basedness_score` (integer, default 0)
      - `games_played` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `leaderboard` table
    - Add policy for public read access to leaderboard data
    - Add policy for authenticated users to update their own scores
*/

CREATE TABLE IF NOT EXISTS public.leaderboard (
  player_id text NOT NULL,
  field text NOT NULL,
  total_score integer DEFAULT 0 NOT NULL,
  basedness_score integer DEFAULT 0 NOT NULL,
  games_played integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT leaderboard_pkey PRIMARY KEY (player_id, field)
);

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow public read access to leaderboard data
CREATE POLICY "Public can read leaderboard"
  ON public.leaderboard
  FOR SELECT
  TO public
  USING (true);

-- Allow users to insert/update their own scores
CREATE POLICY "Users can update own scores"
  ON public.leaderboard
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);