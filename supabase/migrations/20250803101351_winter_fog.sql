/*
  # Create game rooms and related tables

  1. New Tables
    - `rooms`
      - `code` (text, primary key) - unique room code
      - `host_id` (text) - ID of the room host
      - `topic_field` (text) - topic field for the game
      - `status` (text) - current room status (lobby, playing, finished)
      - `created_at` (timestamp) - when room was created
      - `current_round` (integer) - current round number
      - `max_rounds` (integer) - maximum rounds for the game

    - `room_players`
      - `room_code` (text) - reference to room
      - `player_id` (text) - player ID
      - `username` (text) - player username
      - `ready` (boolean) - whether player is ready
      - `score` (integer) - player's current score
      - `joined_at` (timestamp) - when player joined

    - `game_rounds`
      - `room_code` (text) - reference to room
      - `round_number` (integer) - round number
      - `word` (text) - the word for this round
      - `definition` (text) - word definition
      - `word_type` (text) - type of word
      - `status` (text) - round status
      - `started_at` (timestamp) - when round started

    - `takes`
      - `id` (uuid, primary key) - unique take ID
      - `room_code` (text) - reference to room
      - `round_number` (integer) - round number
      - `player_id` (text) - player who submitted take
      - `take_text` (text) - the take content
      - `submitted_at` (timestamp) - when take was submitted

    - `votes`
      - `id` (uuid, primary key) - unique vote ID
      - `room_code` (text) - reference to room
      - `round_number` (integer) - round number
      - `take_id` (uuid) - reference to take being voted on
      - `voter_id` (text) - player who voted
      - `vote_type` (text) - type of vote (based, cringe, etc.)
      - `voted_at` (timestamp) - when vote was cast

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since this is a game app)
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  code text PRIMARY KEY,
  host_id text NOT NULL,
  topic_field text NOT NULL,
  status text NOT NULL DEFAULT 'lobby',
  created_at timestamptz DEFAULT now(),
  current_round integer DEFAULT 0,
  max_rounds integer DEFAULT 3
);

-- Create room_players table
CREATE TABLE IF NOT EXISTS room_players (
  room_code text NOT NULL,
  player_id text NOT NULL,
  username text NOT NULL,
  ready boolean DEFAULT false,
  score integer DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_code, player_id)
);

-- Create game_rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
  room_code text NOT NULL,
  round_number integer NOT NULL,
  word text NOT NULL,
  definition text NOT NULL,
  word_type text NOT NULL,
  status text NOT NULL DEFAULT 'writing',
  started_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_code, round_number)
);

-- Create takes table
CREATE TABLE IF NOT EXISTS takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL,
  round_number integer NOT NULL,
  player_id text NOT NULL,
  take_text text NOT NULL,
  submitted_at timestamptz DEFAULT now()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL,
  round_number integer NOT NULL,
  take_id uuid NOT NULL,
  voter_id text NOT NULL,
  vote_type text NOT NULL,
  voted_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (game functionality)
CREATE POLICY "Public can read rooms"
  ON rooms
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create rooms"
  ON rooms
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update rooms"
  ON rooms
  FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Public can read room players"
  ON room_players
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage room players"
  ON room_players
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read game rounds"
  ON game_rounds
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage game rounds"
  ON game_rounds
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read takes"
  ON takes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage takes"
  ON takes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read votes"
  ON votes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can manage votes"
  ON votes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);