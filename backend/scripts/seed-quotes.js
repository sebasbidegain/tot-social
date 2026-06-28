/**
 * Creates the @totthought bot user and seeds it with attributed quotes.
 * Run: node scripts/seed-quotes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { db, pool } = require('../src/config/db');
const argon2 = require('argon2');

const BOT_USERNAME = 'totthought';
const BOT_EMAIL = 'totthought@tot-social.com';
const BOT_DISPLAY_NAME = 'ToT Thought';
const BOT_BIO = 'Daily wisdom from the greatest minds in history and today. Think. Reflect. Grow.';
const BOT_PASSWORD = 'T0T_Th0ught_B0t_2026!';

const QUOTES = [
  // Ancient philosophers
  { text: 'The unexamined life is not worth living.', author: 'Socrates' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates' },
  { text: 'Happiness depends upon ourselves.', author: 'Aristotle' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: 'He who fears death will never do anything worthy of a living man.', author: 'Seneca' },
  { text: 'It is not death that a man should fear, but he should fear never beginning to live.', author: 'Marcus Aurelius' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'The soul becomes dyed with the color of its thoughts.', author: 'Marcus Aurelius' },
  { text: 'Man is the measure of all things.', author: 'Protagoras' },
  { text: 'Know thyself.', author: 'Thales of Miletus' },
  { text: 'The life which is unexamined is not worth living.', author: 'Plato' },
  { text: 'Courage is knowing what not to fear.', author: 'Plato' },
  { text: 'Good people do not need laws to tell them to act responsibly, while bad people will find a way around the laws.', author: 'Plato' },
  { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca' },
  { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius' },

  // Renaissance & Enlightenment
  { text: 'I think, therefore I am.', author: 'René Descartes' },
  { text: 'The only thing I know is that I know nothing.', author: 'Socrates' },
  { text: 'To be, or not to be, that is the question.', author: 'William Shakespeare' },
  { text: 'The measure of a man is what he does with power.', author: 'Plato' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'Liberty consists in doing what one desires.', author: 'John Stuart Mill' },
  { text: 'I disapprove of what you say, but I will defend to the death your right to say it.', author: 'Voltaire' },
  { text: 'Common sense is not so common.', author: 'Voltaire' },
  { text: 'Man is born free, and everywhere he is in chains.', author: 'Jean-Jacques Rousseau' },
  { text: 'The heart has its reasons which reason knows not.', author: 'Blaise Pascal' },

  // Modern philosophers & thinkers
  { text: 'He who has a why to live for can bear almost any how.', author: 'Friedrich Nietzsche' },
  { text: 'That which does not kill us makes us stronger.', author: 'Friedrich Nietzsche' },
  { text: 'God is dead. God remains dead. And we have killed him.', author: 'Friedrich Nietzsche' },
  { text: 'One cannot step twice in the same river.', author: 'Heraclitus' },
  { text: 'The world is my representation.', author: 'Arthur Schopenhauer' },
  { text: 'Existence precedes essence.', author: 'Jean-Paul Sartre' },
  { text: 'Man is condemned to be free.', author: 'Jean-Paul Sartre' },
  { text: 'Life must be understood backwards. But it must be lived forwards.', author: 'Søren Kierkegaard' },
  { text: 'The limits of my language mean the limits of my world.', author: 'Ludwig Wittgenstein' },
  { text: 'Science is organized knowledge. Wisdom is organized life.', author: 'Immanuel Kant' },

  // Scientists
  { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein' },
  { text: 'Life is like riding a bicycle. To keep your balance, you must keep moving.', author: 'Albert Einstein' },
  { text: 'The important thing is not to stop questioning. Curiosity has its own reason for existing.', author: 'Albert Einstein' },
  { text: 'If I have seen further, it is by standing on the shoulders of giants.', author: 'Isaac Newton' },
  { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie' },
  { text: 'The good thing about science is that it is true whether or not you believe in it.', author: 'Neil deGrasse Tyson' },
  { text: 'However difficult life may seem, there is always something you can do and succeed at.', author: 'Stephen Hawking' },
  { text: 'Intelligence is the ability to adapt to change.', author: 'Stephen Hawking' },
  { text: 'An expert is a person who has made all the mistakes that can be made in a very narrow field.', author: 'Niels Bohr' },
  { text: 'The saddest aspect of life right now is that science gathers knowledge faster than society gathers wisdom.', author: 'Isaac Asimov' },

  // Writers & artists
  { text: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },
  { text: 'To live is the rarest thing in the world. Most people exist, that is all.', author: 'Oscar Wilde' },
  { text: 'It is never too late to be what you might have been.', author: 'George Eliot' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'In three words I can sum up everything I have learned about life: it goes on.', author: 'Robert Frost' },
  { text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { text: 'It does not do to dwell on dreams and forget to live.', author: 'J.K. Rowling' },
  { text: 'The purpose of our lives is to be happy.', author: 'Dalai Lama' },
  { text: 'You must be the change you wish to see in the world.', author: 'Mahatma Gandhi' },
  { text: 'An eye for an eye will only make the whole world blind.', author: 'Mahatma Gandhi' },

  // Civil rights & leaders
  { text: 'Injustice anywhere is a threat to justice everywhere.', author: 'Martin Luther King Jr.' },
  { text: 'The time is always right to do what is right.', author: 'Martin Luther King Jr.' },
  { text: 'Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.', author: 'Martin Luther King Jr.' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela' },
  { text: 'No one can make you feel inferior without your consent.', author: 'Eleanor Roosevelt' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'I have learned over the years that when one\'s mind is made up, this diminishes fear.', author: 'Rosa Parks' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },

  // Contemporary thinkers & entrepreneurs
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'Your time is limited, so don\'t waste it living someone else\'s life.', author: 'Steve Jobs' },
  { text: 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', author: 'Mark Zuckerberg' },
  { text: 'The biggest risk is not taking any risk.', author: 'Mark Zuckerberg' },
  { text: 'When something is important enough, you do it even if the odds are not in your favor.', author: 'Elon Musk' },
  { text: 'I think it is possible for ordinary people to choose to be extraordinary.', author: 'Elon Musk' },
  { text: 'Life is what happens when you are busy making other plans.', author: 'John Lennon' },
  { text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins' },
  { text: 'What we fear doing most is usually what we most need to do.', author: 'Tim Ferriss' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },

  // Eastern wisdom
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'When I let go of what I am, I become what I might be.', author: 'Lao Tzu' },
  { text: 'Nature does not hurry, yet everything is accomplished.', author: 'Lao Tzu' },
  { text: 'It is not the strongest of the species that survive, nor the most intelligent, but the one most responsive to change.', author: 'Charles Darwin' },
  { text: 'Knowing others is intelligence; knowing yourself is true wisdom.', author: 'Lao Tzu' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
  { text: 'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.', author: 'Buddha' },
  { text: 'Peace comes from within. Do not seek it without.', author: 'Buddha' },
  { text: 'In the midst of chaos, there is also opportunity.', author: 'Sun Tzu' },

  // Psychology & human nature
  { text: 'Between stimulus and response there is a space. In that space is our power to choose our response.', author: 'Viktor Frankl' },
  { text: 'When we are no longer able to change a situation, we are challenged to change ourselves.', author: 'Viktor Frankl' },
  { text: 'Everything can be taken from a man but one thing: the last of the human freedoms — to choose one\'s attitude.', author: 'Viktor Frankl' },
  { text: 'Until you make the unconscious conscious, it will direct your life and you will call it fate.', author: 'Carl Jung' },
  { text: 'Who looks outside, dreams; who looks inside, awakes.', author: 'Carl Jung' },
  { text: 'The pendulum of the mind alternates between sense and nonsense, not between right and wrong.', author: 'Carl Jung' },
  { text: 'What a man can be, he must be. This need we call self-actualization.', author: 'Abraham Maslow' },
  { text: 'Knowing is not enough; we must apply. Willing is not enough; we must do.', author: 'Johann Wolfgang von Goethe' },
  { text: 'The mind is not a vessel to be filled, but a fire to be kindled.', author: 'Plutarch' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },

  // Literature & poetry
  { text: 'All that we see or seem is but a dream within a dream.', author: 'Edgar Allan Poe' },
  { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', author: 'Jane Austen' },
  { text: 'I took the one less traveled by, and that has made all the difference.', author: 'Robert Frost' },
  { text: 'To err is human; to forgive, divine.', author: 'Alexander Pope' },
  { text: 'The only thing we have to fear is fear itself.', author: 'Franklin D. Roosevelt' },
  { text: 'Ask not what your country can do for you — ask what you can do for your country.', author: 'John F. Kennedy' },
  { text: 'I have a dream that my four little children will one day live in a nation where they will not be judged by the color of their skin but by the content of their character.', author: 'Martin Luther King Jr.' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Every saint has a past, and every sinner has a future.', author: 'Oscar Wilde' },
  { text: 'The pen is mightier than the sword.', author: 'Edward Bulwer-Lytton' },

  // Modern wisdom
  { text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African Proverb' },
  { text: 'We do not see things as they are, we see them as we are.', author: 'Anaïs Nin' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
  { text: 'In the end, we will remember not the words of our enemies, but the silence of our friends.', author: 'Martin Luther King Jr.' },
  { text: 'The best revenge is massive success.', author: 'Frank Sinatra' },
  { text: 'You miss 100% of the shots you don\'t take.', author: 'Wayne Gretzky' },
  { text: 'Whether you think you can or you think you can\'t, you are right.', author: 'Henry Ford' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
];

function formatQuote(q) {
  return `"${q.text}"\n\n— ${q.author}`;
}

async function main() {
  try {
    // Check if bot user already exists
    const [[existing]] = await db.query(
      'SELECT id FROM users WHERE username = ?', [BOT_USERNAME]
    );

    let botUserId;

    if (existing) {
      botUserId = existing.id;
      console.log(`Bot user @${BOT_USERNAME} already exists (id: ${botUserId})`);
    } else {
      const hash = await argon2.hash(BOT_PASSWORD, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      const [result] = await db.query(
        `INSERT INTO users (username, email, password_hash, display_name, bio, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [BOT_USERNAME, BOT_EMAIL, hash, BOT_DISPLAY_NAME, BOT_BIO]
      );
      botUserId = result.insertId;
      console.log(`Created bot user @${BOT_USERNAME} (id: ${botUserId})`);
    }

    // Check how many quotes already exist
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) as count FROM thoughts WHERE user_id = ? AND is_deleted = 0',
      [botUserId]
    );

    if (count >= QUOTES.length) {
      console.log(`All ${QUOTES.length} quotes already seeded. Nothing to do.`);
      await pool.end();
      return;
    }

    // Get existing content to avoid duplicates
    const [existingThoughts] = await db.query(
      'SELECT content FROM thoughts WHERE user_id = ? AND is_deleted = 0',
      [botUserId]
    );
    const existingSet = new Set(existingThoughts.map(t => t.content));

    let inserted = 0;
    for (const q of QUOTES) {
      const content = formatQuote(q);
      if (existingSet.has(content)) continue;

      await db.query(
        `INSERT INTO thoughts (user_id, content, created_at, updated_at)
         VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? SECOND), NOW())`,
        [botUserId, content, (QUOTES.length - inserted) * 3600]
      );
      inserted++;
    }

    // Update thought count
    await db.query(
      'UPDATE users SET thought_count = (SELECT COUNT(*) FROM thoughts WHERE user_id = ? AND is_deleted = 0) WHERE id = ?',
      [botUserId, botUserId]
    );

    console.log(`Seeded ${inserted} new quotes (${count} already existed). Total: ${count + inserted}`);
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
