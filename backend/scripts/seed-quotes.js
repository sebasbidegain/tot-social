/**
 * Creates the @totthought bot user and seeds it with attributed quotes.
 * Links authors to human-timeline.org bios when available.
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

const HT = 'https://human-timeline.org/en/entities';

const QUOTES = [
  // Ancient philosophers
  { text: 'The unexamined life is not worth living.', author: 'Socrates', ht: 'socrates' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle', ht: 'aristotle' },
  { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates', ht: 'socrates' },
  { text: 'Happiness depends upon ourselves.', author: 'Aristotle', ht: 'aristotle' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: 'He who fears death will never do anything worthy of a living man.', author: 'Seneca' },
  { text: 'It is not death that a man should fear, but he should fear never beginning to live.', author: 'Marcus Aurelius' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'The soul becomes dyed with the color of its thoughts.', author: 'Marcus Aurelius' },
  { text: 'Man is the measure of all things.', author: 'Protagoras' },
  { text: 'Know thyself.', author: 'Thales of Miletus' },
  { text: 'The life which is unexamined is not worth living.', author: 'Plato', ht: 'plato' },
  { text: 'Courage is knowing what not to fear.', author: 'Plato', ht: 'plato' },
  { text: 'Good people do not need laws to tell them to act responsibly, while bad people will find a way around the laws.', author: 'Plato', ht: 'plato' },
  { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle', ht: 'aristotle' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca' },
  { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius' },

  // Renaissance & Enlightenment
  { text: 'I think, therefore I am.', author: 'René Descartes', ht: 'rene-descartes' },
  { text: 'The only thing I know is that I know nothing.', author: 'Socrates', ht: 'socrates' },
  { text: 'To be, or not to be, that is the question.', author: 'William Shakespeare', ht: 'william-shakespeare' },
  { text: 'The measure of a man is what he does with power.', author: 'Plato', ht: 'plato' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein', ht: 'albert-einstein' },
  { text: 'Liberty consists in doing what one desires.', author: 'John Stuart Mill', ht: 'john-stuart-mill' },
  { text: 'I disapprove of what you say, but I will defend to the death your right to say it.', author: 'Voltaire', ht: 'voltaire' },
  { text: 'Common sense is not so common.', author: 'Voltaire', ht: 'voltaire' },
  { text: 'Man is born free, and everywhere he is in chains.', author: 'Jean-Jacques Rousseau', ht: 'jean-jacques-rousseau' },
  { text: 'The heart has its reasons which reason knows not.', author: 'Blaise Pascal' },

  // Modern philosophers & thinkers
  { text: 'He who has a why to live for can bear almost any how.', author: 'Friedrich Nietzsche', ht: 'friedrich-nietzsche' },
  { text: 'That which does not kill us makes us stronger.', author: 'Friedrich Nietzsche', ht: 'friedrich-nietzsche' },
  { text: 'God is dead. God remains dead. And we have killed him.', author: 'Friedrich Nietzsche', ht: 'friedrich-nietzsche' },
  { text: 'One cannot step twice in the same river.', author: 'Heraclitus' },
  { text: 'The world is my representation.', author: 'Arthur Schopenhauer' },
  { text: 'Existence precedes essence.', author: 'Jean-Paul Sartre' },
  { text: 'Man is condemned to be free.', author: 'Jean-Paul Sartre' },
  { text: 'Life must be understood backwards. But it must be lived forwards.', author: 'Søren Kierkegaard' },
  { text: 'The limits of my language mean the limits of my world.', author: 'Ludwig Wittgenstein', ht: 'ludwig-wittgenstein' },
  { text: 'Science is organized knowledge. Wisdom is organized life.', author: 'Immanuel Kant', ht: 'immanuel-kant' },

  // Scientists
  { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein', ht: 'albert-einstein' },
  { text: 'Life is like riding a bicycle. To keep your balance, you must keep moving.', author: 'Albert Einstein', ht: 'albert-einstein' },
  { text: 'The important thing is not to stop questioning. Curiosity has its own reason for existing.', author: 'Albert Einstein', ht: 'albert-einstein' },
  { text: 'If I have seen further, it is by standing on the shoulders of giants.', author: 'Isaac Newton', ht: 'isaac-newton' },
  { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie', ht: 'marie-curie' },
  { text: 'The good thing about science is that it is true whether or not you believe in it.', author: 'Neil deGrasse Tyson', ht: 'neil-degrasse-tyson' },
  { text: 'However difficult life may seem, there is always something you can do and succeed at.', author: 'Stephen Hawking', ht: 'stephen-hawking' },
  { text: 'Intelligence is the ability to adapt to change.', author: 'Stephen Hawking', ht: 'stephen-hawking' },
  { text: 'An expert is a person who has made all the mistakes that can be made in a very narrow field.', author: 'Niels Bohr', ht: 'niels-bohr' },
  { text: 'The saddest aspect of life right now is that science gathers knowledge faster than society gathers wisdom.', author: 'Isaac Asimov' },

  // Writers & artists
  { text: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },
  { text: 'To live is the rarest thing in the world. Most people exist, that is all.', author: 'Oscar Wilde' },
  { text: 'It is never too late to be what you might have been.', author: 'George Eliot' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', ht: 'steve-jobs' },
  { text: 'In three words I can sum up everything I have learned about life: it goes on.', author: 'Robert Frost' },
  { text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { text: 'It does not do to dwell on dreams and forget to live.', author: 'J.K. Rowling' },
  { text: 'The purpose of our lives is to be happy.', author: 'Dalai Lama', ht: '14th-dalai-lama' },
  { text: 'You must be the change you wish to see in the world.', author: 'Mahatma Gandhi', ht: 'mahatma-gandhi' },
  { text: 'An eye for an eye will only make the whole world blind.', author: 'Mahatma Gandhi', ht: 'mahatma-gandhi' },

  // Civil rights & leaders
  { text: 'Injustice anywhere is a threat to justice everywhere.', author: 'Martin Luther King Jr.', ht: 'martin-luther-king-jr' },
  { text: 'The time is always right to do what is right.', author: 'Martin Luther King Jr.', ht: 'martin-luther-king-jr' },
  { text: 'Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.', author: 'Martin Luther King Jr.', ht: 'martin-luther-king-jr' },
  { text: 'Education is the most powerful weapon which you can use to change the world.', author: 'Nelson Mandela', ht: 'nelson-mandela' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela', ht: 'nelson-mandela' },
  { text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', author: 'Nelson Mandela', ht: 'nelson-mandela' },
  { text: 'No one can make you feel inferior without your consent.', author: 'Eleanor Roosevelt', ht: 'eleanor-roosevelt' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt', ht: 'eleanor-roosevelt' },
  { text: 'I have learned over the years that when one\'s mind is made up, this diminishes fear.', author: 'Rosa Parks', ht: 'rosa-parks' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill', ht: 'winston-churchill' },

  // Contemporary thinkers & entrepreneurs
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs', ht: 'steve-jobs' },
  { text: 'Your time is limited, so don\'t waste it living someone else\'s life.', author: 'Steve Jobs', ht: 'steve-jobs' },
  { text: 'Move fast and break things. Unless you are breaking stuff, you are not moving fast enough.', author: 'Mark Zuckerberg', ht: 'mark-zuckerberg' },
  { text: 'The biggest risk is not taking any risk.', author: 'Mark Zuckerberg', ht: 'mark-zuckerberg' },
  { text: 'When something is important enough, you do it even if the odds are not in your favor.', author: 'Elon Musk', ht: 'elon-musk' },
  { text: 'I think it is possible for ordinary people to choose to be extraordinary.', author: 'Elon Musk', ht: 'elon-musk' },
  { text: 'Life is what happens when you are busy making other plans.', author: 'John Lennon', ht: 'john-lennon' },
  { text: 'The only impossible journey is the one you never begin.', author: 'Tony Robbins', ht: 'tony-robbins' },
  { text: 'What we fear doing most is usually what we most need to do.', author: 'Tim Ferriss', ht: 'tim-ferriss' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg', ht: 'sheryl-sandberg' },

  // Eastern wisdom
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'When I let go of what I am, I become what I might be.', author: 'Lao Tzu' },
  { text: 'Nature does not hurry, yet everything is accomplished.', author: 'Lao Tzu' },
  { text: 'It is not the strongest of the species that survive, nor the most intelligent, but the one most responsive to change.', author: 'Charles Darwin', ht: 'charles-darwin' },
  { text: 'Knowing others is intelligence; knowing yourself is true wisdom.', author: 'Lao Tzu' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
  { text: 'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.', author: 'Buddha' },
  { text: 'Peace comes from within. Do not seek it without.', author: 'Buddha' },
  { text: 'In the midst of chaos, there is also opportunity.', author: 'Sun Tzu', ht: 'sun-tzu' },

  // Psychology & human nature
  { text: 'Between stimulus and response there is a space. In that space is our power to choose our response.', author: 'Viktor Frankl' },
  { text: 'When we are no longer able to change a situation, we are challenged to change ourselves.', author: 'Viktor Frankl' },
  { text: 'Everything can be taken from a man but one thing: the last of the human freedoms — to choose one\'s attitude.', author: 'Viktor Frankl' },
  { text: 'Until you make the unconscious conscious, it will direct your life and you will call it fate.', author: 'Carl Jung', ht: 'carl-jung' },
  { text: 'Who looks outside, dreams; who looks inside, awakes.', author: 'Carl Jung', ht: 'carl-jung' },
  { text: 'The pendulum of the mind alternates between sense and nonsense, not between right and wrong.', author: 'Carl Jung', ht: 'carl-jung' },
  { text: 'What a man can be, he must be. This need we call self-actualization.', author: 'Abraham Maslow' },
  { text: 'Knowing is not enough; we must apply. Willing is not enough; we must do.', author: 'Johann Wolfgang von Goethe', ht: 'johann-wolfgang-von-goethe' },
  { text: 'The mind is not a vessel to be filled, but a fire to be kindled.', author: 'Plutarch' },
  { text: 'We suffer more often in imagination than in reality.', author: 'Seneca' },

  // Literature & poetry
  { text: 'All that we see or seem is but a dream within a dream.', author: 'Edgar Allan Poe', ht: 'edgar-allan-poe' },
  { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', author: 'Jane Austen' },
  { text: 'I took the one less traveled by, and that has made all the difference.', author: 'Robert Frost' },
  { text: 'To err is human; to forgive, divine.', author: 'Alexander Pope' },
  { text: 'The only thing we have to fear is fear itself.', author: 'Franklin D. Roosevelt' },
  { text: 'Ask not what your country can do for you — ask what you can do for your country.', author: 'John F. Kennedy' },
  { text: 'I have a dream that my four little children will one day live in a nation where they will not be judged by the color of their skin but by the content of their character.', author: 'Martin Luther King Jr.', ht: 'martin-luther-king-jr' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci', ht: 'leonardo-da-vinci' },
  { text: 'Every saint has a past, and every sinner has a future.', author: 'Oscar Wilde' },
  { text: 'The pen is mightier than the sword.', author: 'Edward Bulwer-Lytton' },

  // Modern wisdom
  { text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African Proverb' },
  { text: 'We do not see things as they are, we see them as we are.', author: 'Anaïs Nin' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
  { text: 'In the end, we will remember not the words of our enemies, but the silence of our friends.', author: 'Martin Luther King Jr.', ht: 'martin-luther-king-jr' },
  { text: 'The best revenge is massive success.', author: 'Frank Sinatra' },
  { text: 'You miss 100% of the shots you don\'t take.', author: 'Wayne Gretzky', ht: 'wayne-gretzky' },
  { text: 'Whether you think you can or you think you can\'t, you are right.', author: 'Henry Ford', ht: 'henry-ford' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain', ht: 'mark-twain' },
];

function formatQuote(q) {
  const attribution = q.ht
    ? `— ${q.author} · Bio: ${HT}/${q.ht}`
    : `— ${q.author}`;
  return `"${q.text}"\n\n${attribution}`;
}

async function main() {
  try {
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

    // Delete all existing quotes to re-seed with links
    const [delResult] = await db.query(
      'DELETE FROM thoughts WHERE user_id = ?', [botUserId]
    );
    if (delResult.affectedRows > 0) {
      console.log(`Cleared ${delResult.affectedRows} old quotes`);
    }

    let inserted = 0;
    for (const q of QUOTES) {
      const content = formatQuote(q);
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

    console.log(`Seeded ${inserted} quotes with human-timeline links where available`);
    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
