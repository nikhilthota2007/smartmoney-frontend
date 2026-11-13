/**
 * Spending categories, and the merchants recognised on the device.
 *
 * Most of a statement is the same few hundred merchants. Recognising them
 * here means most statements never need to send anything to an AI; only the
 * descriptions left over are sent, after redaction, to be sorted.
 */

/** Every category a transaction can end up in, with how the plan shows it. */
export const CATEGORIES = {
  groceries: { label: 'Groceries', profile: ['variable', 'groceries'] },
  dining: { label: 'Eating out', profile: ['variable', 'dining'] },
  delivery: { label: 'Delivery', profile: ['variable', 'dining'] },
  coffee: { label: 'Coffee', profile: ['variable', 'dining'] },
  transport: { label: 'Getting around', profile: ['variable', 'transport'] },
  shopping: { label: 'Shopping', profile: ['variable', 'shopping'] },
  personal: { label: 'Personal care', profile: ['variable', 'shopping'] },
  subscriptions: { label: 'Subscriptions', profile: ['fixed', 'subscriptions'] },
  entertainment: { label: 'Fun', profile: ['variable', 'entertainment'] },
  health: { label: 'Health', profile: ['variable', 'health'] },
  travel: { label: 'Travel', profile: ['variable', 'other'] },
  bills: { label: 'Bills', profile: ['fixed', 'utilities'] },
  housing: { label: 'Housing', profile: ['fixed', 'housing'] },
  insurance: { label: 'Insurance', profile: ['fixed', 'insurance'] },
  education: { label: 'Education', profile: ['variable', 'other'] },
  transfers: { label: 'Sent to people', profile: ['variable', 'other'] },
  fees_interest: { label: 'Interest & fees', profile: null },
  payment: { label: 'Payments & credits', profile: null },
  other: { label: 'Other', profile: ['variable', 'other'] },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

/** Checked in order: the first match wins. */
const RULES = [
  ['fees_interest', /\b(interest charge|interest charged|purchase interest|cash advance interest|late fee|annual fee|annual membership fee|foreign transaction fee|over ?limit fee|returned payment fee|cash advance fee|finance charge|overdraft|nsf fee|monthly service fee|maintenance fee)\b/i],
  ['delivery', /\b(doordash|uber\s*\*?\s*eats|ubereats|grubhub|postmates|seamless|caviar|deliveroo|gopuff)\b/i],
  ['coffee', /\b(starbucks|dunkin|peet'?s|dutch bros|blue bottle|tim hortons|philz|coffee|espresso)\b/i],
  ['subscriptions', /\b(chegg study|kindle unlimited|kindle unltd|netflix|spotify|hulu|disney\s*(plus|\+)|hbo|max\.com|paramount|peacock|apple\.com\/bill|itunes|youtube\s*premium|google\s*\*?\s*(storage|one|youtube)|amazon prime|prime video|audible|patreon|dropbox|adobe|microsoft\s*\*?\s*365|openai|chatgpt|anthropic|planet fitness|equinox|orangetheory|classpass|peloton|crunch fitness|la fitness|24 hour fitness|duolingo|headspace|calm\.com|siriusxm|nytimes|new york times|wsj|substack|icloud)\b/i],
  ['transfers', /\b(zelle|venmo|cash ?app|square cash|apple cash|paypal\s*\*?\s*(inst xfer|transfer))\b/i],
  ['groceries', /\b(trader joe|whole foods|wholefds|kroger|safeway|aldi|publix|wegmans|h-?e-?b|costco(?!\s*gas)|sprouts|food lion|giant eagle|stop & shop|meijer|winco|instacart|albertsons|ralphs|vons|harris teeter|smart & final|grocery|supermarket)\b/i],
  ['transport', /\b(uber|lyft|metro|transit|mta|bart|clipper|parking|toll|shell|chevron|exxon|mobil|bp#?\d*|sunoco|valero|circle k|speedway|marathon petro|quiktrip|qt \d+|wawa|costco gas|76 |arco|citgo|gas station|fuel)\b/i],
  ['travel', /\b(airline|airlines|delta air|united air|american air|southwest|jetblue|alaska air|spirit air|frontier|hotel|marriott|hilton|hyatt|airbnb|expedia|booking\.com|amtrak|greyhound)\b/i],
  ['bills', /\b(verizon|at&t|att\*|t-mobile|tmobile|comcast|xfinity|spectrum|cox comm|electric|energy|pg&e|duke energy|con ed|water util|utilities|internet)\b/i],
  ['housing', /\b(rent|apartments?|property mgmt|leasing office|mortgage|hoa)\b/i],
  ['insurance', /\b(geico|progressive|state farm|allstate|lemonade|liberty mutual|insurance)\b/i],
  ['health', /\b(cvs|walgreens|rite aid|pharmacy|dental|medical|clinic|hospital|urgent care|optometr|labcorp|quest diag)\b/i],
  ['personal', /\b(sephora|ulta|salon|barber|nail|spa\b)/i],
  ['entertainment', /\b(amc|regal|cinemark|cinema|theatres?|theaters?|ticketmaster|stubhub|eventbrite|bowl|steam games|steampowered|playstation|xbox|nintendo|twitch|brewery|nightclub|concert)\b/i],
  ['education', /\b(tuition|university|college|coursera|udemy|chegg|bookstore)\b/i],
  ['shopping', /\b(amazon|amzn|target|walmart|wal-mart|best buy|ikea|etsy|ebay|shein|temu|zara|h&m|uniqlo|nordstrom|macy'?s|tj ?maxx|marshalls|ross stores|old navy|gap\b|nike|adidas|home depot|lowe'?s|apple store)\b/i],
  ['dining', /\b(restaurant|grill|pizza|sushi|taco|burger|mcdonald|chipotle|sweetgreen|chick-fil-a|wendy'?s|subway|panera|domino|kitchen|diner|bbq|cafe|bistro|tst\*|wingstop|shake shack|five guys|popeyes|kfc|taco bell|dine)\b/i],
];

/**
 * The category for one transaction, or null when the device does not know.
 * Money coming in is a payment or credit whatever the description says.
 */
export const categorizeLocally = ({ description, amount }) => {
  if (amount < 0) return 'payment';
  if (/\b(payment|autopay|auto pay)\b.*\b(thank you|received|web|online|ach)\b/i.test(description)) return 'payment';
  for (const [category, pattern] of RULES) {
    if (pattern.test(description)) return category;
  }
  return null;
};
