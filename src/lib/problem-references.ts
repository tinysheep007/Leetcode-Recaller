// Curated, original short summaries. Source pages checked 2026-10-20.
// These are recall prompts, not full statements, examples or solution hints.
// See docs/PROBLEM_REFERENCES.md for coverage, aliases and source limitations.
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ProblemReference = { url: string; description: string; difficulty?: Difficulty };
const rows = `
contains-duplicate|Easy|Check whether an integer list contains any repeated value.
valid-anagram|Easy|Decide whether two strings have exactly the same letters with the same multiplicities, allowing their order to differ.
two-sum|Easy|Find the two distinct positions whose values total the target. Exactly one pair exists; return its indices.
group-anagrams|Medium|Partition a list of words into groups whose members use the same letters with the same counts.
top-k-frequent-elements|Medium|Return the k distinct values that occur most often in an integer list. Output order does not matter.
encode-and-decode-strings|Medium|
product-of-array-except-self|Medium|For each position, return the product of all other values. Division is forbidden and the required running time is linear.
longest-consecutive-sequence|Medium|Find the largest number of consecutive integer values present in an unsorted list. Their input positions need not be adjacent; use linear time.
valid-sudoku|Medium|Check the filled entries of a 9-by-9 Sudoku board for repeated digits in any row, column or 3-by-3 box. Empty cells need not be solved.
majority-element|Easy|Find the value occupying more than half of an array. Such a value is guaranteed to exist.
length-of-last-word|Easy|Count the characters in the final word of a string, ignoring any trailing spaces.
find-the-index-of-the-first-occurrence-in-a-string|Easy|Locate the earliest starting index of a requested substring. Return -1 when it does not occur.
isomorphic-strings|Easy|Decide whether a consistent one-to-one replacement of characters transforms one string into the other without changing character positions.
contains-duplicate-ii|Easy|Check whether equal values occur at different array indices separated by at most k positions.
happy-number|Easy|Repeatedly replace a positive integer with the sum of its squared decimal digits. Decide whether this process eventually reaches 1.
valid-palindrome|Easy|Ignore punctuation and letter case, then check whether the remaining letters and digits read identically in both directions.
two-sum-ii-input-array-is-sorted|Medium|In a sorted integer array, find the unique pair totaling the target. Return increasing, one-based indices and use constant auxiliary space.
3sum|Medium|List the distinct value triplets totaling zero, using three different positions for each triplet. Do not repeat equivalent triplets.
container-with-most-water|Medium|Choose two vertical lines from the given heights to maximize the water held between them and the horizontal axis. Return that area.
trapping-rain-water|Hard|An array describes unit-width column heights. Calculate the total water that can remain trapped between the columns after rain.
is-subsequence|Easy|Decide whether deleting zero or more characters from the second string can produce the first while keeping the remaining characters in order.
best-time-to-buy-and-sell-stock|Easy|Choose one purchase day and a later sale day to maximize profit from daily prices. Return zero if no profitable trade exists.
longest-substring-without-repeating-characters|Medium|Find the greatest length of a contiguous string segment containing no character more than once.
longest-repeating-character-replacement|Medium|You may replace at most k uppercase letters. Find the longest contiguous segment that can become a single repeated letter.
permutation-in-string|Medium|Check whether the second string contains a contiguous segment using exactly the letters of the first, in any order.
minimum-window-substring|Hard|Return the shortest segment of the first string containing every required character from the second, including repeated characters. Return an empty string if impossible.
sliding-window-maximum|Hard|Move a length-k window across an array one position at a time. Return the maximum value for every window.
valid-parentheses|Easy|Check that every opening round, square or curly bracket has a closing bracket of the same kind, with correctly nested ordering.
min-stack|Medium|Implement a stack with insertion, removal, top lookup and minimum lookup. Every operation must take constant time.
evaluate-reverse-polish-notation|Medium|Evaluate a tokenized postfix arithmetic expression using addition, subtraction, multiplication and division. Integer division rounds toward zero.
generate-parentheses|Medium|Produce every distinct balanced arrangement containing n opening parentheses and n closing parentheses.
daily-temperatures|Medium|For each daily temperature, report how many days pass before a strictly warmer day. Use zero if none follows.
car-fleet|Medium|Cars travel toward one destination without passing. A car catching another joins its speed. Count the fleets reaching the destination; meeting there also counts as joining.
find-minimum-in-rotated-sorted-array|Medium|A strictly increasing array has been rotated. Return its smallest value with logarithmic running time.
search-in-rotated-sorted-array|Medium|Find a target index in a rotated, strictly increasing array, or return -1 if absent. The search must take logarithmic time.
search-a-2d-matrix|Medium|Determine whether a target appears in a matrix with sorted rows, each starting above the previous row's final value. Use logarithmic search time.
koko-eating-bananas|Medium|Choose the smallest integer eating speed that finishes all piles within h hours. Each hour can be spent on only one pile.
time-based-key-value-store|Medium|Store timestamped values for keys. A lookup returns the value with the latest timestamp no later than the requested time, or an empty string.
reverse-linked-list|Easy|Reverse the direction of a singly linked list and return its new head.
merge-two-sorted-lists|Easy|Combine two sorted linked lists into one sorted list by reconnecting their existing nodes. Return the resulting head.
linked-list-cycle|Easy|Determine whether repeatedly following next pointers can revisit a node in the given linked list.
reorder-list|Medium|Rearrange linked-list nodes by taking the first, last, second, second-last and so on. Change links rather than node values.
remove-nth-node-from-end-of-list|Medium|Delete the node that is n positions from the end of a linked list. Return the possibly changed head.
merge-k-sorted-lists|Hard|Combine k individually sorted linked lists into one linked list in ascending order.
add-two-numbers|Medium|Two linked lists hold decimal digits in reverse order. Add the represented nonnegative integers and return the sum in the same linked-list format.
copy-list-with-random-pointer|Medium|Create an independent copy of a linked list whose nodes have next and random pointers. Copied pointers must preserve relationships without referencing original nodes.
find-the-duplicate-number|Medium|An array of n+1 integers uses values from 1 through n with exactly one duplicated value. Find it without changing the array and with constant auxiliary space.
lru-cache|Medium|Implement a bounded key-value cache with get and put. On overflow, discard the least recently accessed key. Both operations require constant average time.
lfu-cache|Hard|Implement a bounded key-value cache that evicts the least frequently used key, breaking ties by least recent use. Reads and updates affect usage; operations require constant average time.
invert-binary-tree|Easy|Transform a binary tree into its mirror image by exchanging left and right children throughout the tree. Return the root.
maximum-depth-of-binary-tree|Easy|Report the number of nodes on the longest route from the root to any leaf. An empty tree has depth zero.
same-tree|Easy|Decide whether two binary trees have identical shapes and equal values at corresponding nodes.
subtree-of-another-tree|Easy|Check whether a node in the first tree roots a subtree matching the entire second tree in both shape and values.
lowest-common-ancestor-of-a-binary-search-tree|Medium|Find the deepest node in a binary search tree that is an ancestor of both requested nodes. A node may be its own ancestor.
binary-tree-level-order-traversal|Medium|Return binary-tree values grouped by depth, visiting each level from left to right.
validate-binary-search-tree|Medium|Check that every node's left subtree contains only smaller values and its right subtree only larger values, throughout the tree.
kth-smallest-element-in-a-bst|Medium|Return the value ranked k-th smallest among the nodes of a binary search tree, counting ranks from one.
construct-binary-tree-from-preorder-and-inorder-traversal|Medium|Rebuild the unique binary tree described by its preorder and inorder value sequences. Node values are distinct.
binary-tree-maximum-path-sum|Hard|Find the greatest sum over any nonempty path in a binary tree. Adjacent path nodes share an edge, no node repeats, and the path need not include the root.
serialize-and-deserialize-binary-tree|Hard|Design a string representation of a binary tree and its inverse operation. Decoding the representation must restore the original tree's structure and values.
diameter-of-binary-tree|Easy|Count the edges in the longest path connecting any pair of binary-tree nodes. The path may avoid the root.
balanced-binary-tree|Easy|Determine whether the left and right subtree heights differ by at most one at every node of a binary tree.
binary-tree-right-side-view|Medium|List the values visible when looking at a binary tree from its right side, from the highest level downward.
count-good-nodes-in-binary-tree|Medium|Count nodes whose value is at least every value on the route from the root to that node, including the node itself.
path-sum|Easy|Decide whether any root-to-leaf route has node values summing to the requested target.
count-complete-tree-nodes|Easy|Count nodes in a complete binary tree, whose final level is filled leftward. Use a method faster than visiting every node.
lowest-common-ancestor-of-a-binary-tree|Medium|Find the deepest ancestor shared by two specified binary-tree nodes. Either requested node can itself be the answer.
find-median-from-data-stream|Hard|Support adding integers to a growing collection and querying its median. For an even count, return the mean of the middle two sorted values.
kth-largest-element-in-a-stream|Easy|Initialize a stream tracker with k and starting values. Each insertion returns the k-th largest value seen so far, counting duplicates separately.
last-stone-weight|Easy|Repeatedly smash the two heaviest stones. Equal weights disappear; otherwise retain their difference. Return the remaining weight, or zero if none remain.
k-closest-points-to-origin|Medium|Return the k input points with the smallest Euclidean distance from the origin. Their output order is unrestricted.
kth-largest-element-in-an-array|Medium|Return the value at rank k when array elements are ordered from largest to smallest. Repeated values count separately.
task-scheduler|Medium|Schedule unit-duration labeled tasks, inserting idle intervals if needed so identical labels have at least n intervening intervals. Minimize the total elapsed intervals.
design-twitter|Medium|Implement posting, following and unfollowing users. A user's feed returns up to ten latest tweet IDs from that user and their followees, newest first.
combination-sum|Medium|Find distinct combinations of positive candidate values totaling the target. Each distinct candidate may be used repeatedly; order within a combination does not matter.
word-search|Medium|Check whether a word can be traced through horizontally or vertically adjacent board cells without using any cell twice.
subsets|Medium|Generate all selections from an array of distinct values, including the empty selection. Return each subset once.
permutations|Medium|Generate every possible ordering of an array of distinct integers.
subsets-ii|Medium|Generate every distinct subset of an array that may contain repeated values. Equivalent subsets must appear only once.
combination-sum-ii|Medium|Find distinct combinations totaling a target. Candidates may repeat in the input, but each input position can be used only once per combination.
palindrome-partitioning|Medium|Split a string into contiguous pieces so every piece reads identically forward and backward. Return all possible valid splits.
letter-combinations-of-a-phone-number|Medium|Given digits from 2 through 9, list every letter string represented by their mappings on a telephone keypad.
implement-trie-prefix-tree|Medium|Implement a word collection supporting insertion, exact-word membership checks and checks for whether any stored word begins with a given prefix.
design-add-and-search-words-data-structure|Medium|Implement word insertion and membership queries where a period in the query matches any single letter.
word-search-ii|Hard|Find all dictionary words traceable through horizontally or vertically adjacent board cells. A cell cannot repeat within the same word's path.
number-of-islands|Medium|Count separate land regions in a binary grid. Land cells connect horizontally or vertically, and the grid's outer boundary borders water.
clone-graph|Medium|Starting from a node of a connected undirected graph, create an independent graph copy preserving all node values and neighbor relationships.
pacific-atlantic-water-flow|Medium|Water can move to an adjacent cell of equal or lower height. Return cells that can reach both the top/left ocean and the bottom/right ocean.
course-schedule|Medium|Given course prerequisite pairs, decide whether it is possible to complete every course while satisfying all prerequisites.
graph-valid-tree|Medium|Determine whether the supplied undirected edges connect the n labeled nodes into a tree. Duplicate edges are excluded.
number-of-connected-components-in-an-undirected-graph|Medium|
max-area-of-island|Medium|Find the largest land region in a binary grid, measuring area by its cell count. Only horizontal and vertical neighbors connect.
rotting-oranges|Medium|Each minute, rotten oranges infect adjacent fresh oranges horizontally and vertically. Return the minutes until no fresh orange remains, or -1 if impossible.
surrounded-regions|Medium|Change every O-region completely enclosed by X cells into X cells. Horizontal or vertical connections to a boundary O prevent capture.
course-schedule-ii|Medium|Return an order for completing all courses that respects every prerequisite. Return an empty array when no such order exists.
redundant-connection|Medium|An undirected tree received one extra edge. Return an edge whose removal restores a tree; if several qualify, choose the one occurring last in the input.
walls-and-gates|Medium|Fill each empty room with the fewest horizontal or vertical steps to a gate without crossing walls. Rooms with no reachable gate retain their infinity marker.
alien-dictionary|Hard|
min-cost-to-connect-all-points|Medium|Connect all given planar points while minimizing total edge cost. Connecting two points costs the sum of their absolute coordinate differences.
network-delay-time|Medium|A signal starts at one node and travels along directed edges with specified delays. Return when every node has received it, or -1 if some cannot.
word-ladder|Hard|Find the shortest sequence from a starting word to a destination word, changing one letter per step and using dictionary words after the start. Return its word count, or zero.
reconstruct-itinerary|Hard|Use every airline ticket exactly once to construct a route starting at JFK. If several routes work, return the lexicographically smallest one.
climbing-stairs|Easy|Count the distinct sequences of one-step and two-step moves that reach exactly the top of an n-step staircase.
min-cost-climbing-stairs|Easy|Start at stair zero or one. Pay a stair's cost when leaving it, then move one or two stairs. Minimize the cost to move beyond the final stair.
house-robber|Medium|Choose houses along a line to maximize the sum of their money, with the restriction that neighboring houses cannot both be chosen.
house-robber-ii|Medium|Maximize the money collected from houses arranged in a circle without taking neighboring houses. The first and last houses are also neighbors.
longest-palindromic-substring|Medium|Return a longest contiguous segment of a string that reads identically forward and backward.
palindromic-substrings|Medium|Count contiguous string segments that read identically in either direction. Matching text at different positions counts as separate occurrences.
decode-ways|Medium|Count ways to split a digit string into valid codes 1 through 26, corresponding to letters A through Z. A code cannot start with zero.
coin-change|Medium|With unlimited coins of the given denominations, minimize the coin count totaling an amount. Return -1 if no combination works.
maximum-product-subarray|Medium|Return the greatest product obtainable from a nonempty contiguous segment of an integer array.
word-break|Medium|Decide whether a string can be split entirely into words from a supplied dictionary. A dictionary word may be used repeatedly.
longest-increasing-subsequence|Medium|Find the greatest length of a strictly increasing selection of array elements whose original order is preserved; selected positions need not be adjacent.
partition-equal-subset-sum|Medium|Decide whether all array elements can be divided between two groups with equal sums.
unique-paths|Medium|Count routes across an m-by-n grid from the upper-left corner to the lower-right corner using only moves right or down.
longest-common-subsequence|Medium|Find the longest length of a character sequence obtainable from each of two strings by deletion while preserving order.
best-time-to-buy-and-sell-stock-with-cooldown|Medium|Maximize profit through repeated stock purchases and sales, holding at most one share. After selling, wait one full day before buying again.
coin-change-ii|Medium|Count distinct combinations of unlimited coins that total the requested amount. Different ordering of the same coins is not a new combination.
interleaving-string|Medium|Decide whether a third string can be formed using every character from two source strings while preserving the character order within each source.
edit-distance|Medium|Find the fewest single-character insertions, deletions or replacements needed to turn one word into another.
maximum-subarray|Medium|Return the greatest sum obtainable from any nonempty contiguous segment of an integer array.
jump-game|Medium|Each array value sets the maximum forward jump from that position. Decide whether the final position is reachable from the first.
jump-game-ii|Medium|Each array value gives the maximum forward jump distance. Find the fewest jumps from the first position to the last; reaching it is guaranteed.
gas-station|Medium|Find a starting station that permits a full clockwise circuit, beginning with an empty tank. Stations add fuel and route segments consume fuel. Return -1 if impossible.
hand-of-straights|Medium|Decide whether all cards can be partitioned into equal-size groups, each containing consecutive integer values exactly once.
merge-triplets-to-form-target-triplet|Medium|You may replace one triplet by coordinate-wise maxima of it and another triplet. Decide whether repeated operations can produce the target triplet.
partition-labels|Medium|Split a string into as many contiguous parts as possible while keeping every occurrence of any letter in just one part. Return the part lengths.
valid-parenthesis-string|Medium|Determine whether a string can be balanced when each asterisk may independently represent an opening parenthesis, a closing parenthesis or nothing.
insert-interval|Medium|Insert a new interval into sorted, disjoint intervals. Merge any overlaps and return the resulting sorted, disjoint collection.
merge-intervals|Medium|Combine overlapping closed intervals so the output covers exactly the original ranges without overlapping entries.
non-overlapping-intervals|Medium|Find the fewest intervals to discard so the remaining intervals do not overlap. Sharing an endpoint is allowed.
meeting-rooms|Easy|
meeting-rooms-ii|Medium|
summary-ranges|Easy|Compress a sorted list of distinct integers into maximal consecutive ranges, using a single number for singleton ranges and a->b otherwise.
rotate-image|Medium|Rotate a square matrix clockwise through 90 degrees by modifying the matrix itself, without allocating a second matrix.
spiral-matrix|Medium|Return a rectangular matrix's values in clockwise spiral order, beginning at its upper-left corner and continuing inward.
set-matrix-zeroes|Medium|Modify a matrix so every row and column containing an original zero becomes entirely zero. Apply the changes in place.
plus-one|Easy|A decimal digit array stores a nonnegative integer with the most significant digit first. Return the digit array after adding one.
powx-n|Medium|Compute a number raised to an integer exponent, including negative and zero exponents.
multiply-strings|Medium|Multiply two nonnegative integers supplied as decimal strings and return a decimal string. Do not directly convert the inputs to integers or use a big-integer library.
detect-squares|Medium|Store planar points, including duplicates. For a query point, count ways to choose three stored points forming a positive-area square aligned with the coordinate axes.
single-number|Easy|Exactly one array value occurs once and every other value twice. Find the single value with linear time and constant auxiliary space.
number-of-1-bits|Easy|Count how many binary digits are set to one in the given positive integer.
counting-bits|Easy|For every integer from zero through n, return its count of binary one digits. Do not use a built-in population-count function.
reverse-bits|Easy|Reverse the order of all 32 bits in the input integer's binary representation and return the resulting value.
missing-number|Easy|An array contains n distinct values drawn from zero through n. Find the single missing value in that range.
sum-of-two-integers|Medium|Compute the sum of two integers without using addition or subtraction operators.
reverse-integer|Medium|Reverse a signed integer's decimal digits while preserving its sign. Return zero if the result exceeds the signed 32-bit range; do not use a 64-bit integer.
`.trim().split('\n');

function normalize(title: string) {
  return title.toLowerCase().replace(/^\s*\d+\s*[.·]\s*/, '').replace(/[^a-z0-9]/g, '');
}
const references = new Map<string, ProblemReference>();
for (const row of rows) {
  const [slug, difficulty, description] = row.split('|');
  references.set(normalize(slug), { url: `https://leetcode.com/problems/${slug}/`, description, difficulty: difficulty as Difficulty });
}
// Explicit aliases for the current archive. Never infer a match from a number alone.
const aliases: Record<string, string> = {
  'Two Sums II': 'two-sum-ii-input-array-is-sorted',
  'Trapping Rainwater': 'trapping-rain-water',
  'Valid parententhy': 'valid-parentheses',
  'Binary tree maximum sum path': 'binary-tree-maximum-path-sum',
  'Serialize and De serialize Binary Tree': 'serialize-and-deserialize-binary-tree',
  'Find the median from data stream': 'find-median-from-data-stream',
  'Implement Tree (Prefix tree)': 'implement-trie-prefix-tree',
  'Missing Numbers': 'missing-number',
};
for (const [alias, slug] of Object.entries(aliases)) references.set(normalize(alias), references.get(normalize(slug))!);
references.set(normalize('AlgoMonster - Newspapers'), {
  url: 'https://algo.monster/problems/newspapers_split',
  description: 'Split ordered newspaper reading times into contiguous groups for at most the available coworkers. They work in parallel; minimize the time when the last coworker finishes.',
});
references.set(normalize('AlgoMonster - The Peak of a Mountain Array'), {
  url: 'https://algo.monster/problems/peak_of_mountain_array',
  description: 'Values strictly increase to a single interior peak and then strictly decrease. Return the index of that peak.',
});

export function findProblemReference(title: string): ProblemReference | undefined {
  return references.get(normalize(title));
}

/** Fill missing metadata only. Do not change IDs, notes, scheduling or existing metadata. */
export function withProblemReference<T extends { title: string; description: string; url: string; difficulty?: Difficulty }>(problem: T): T {
  const reference = findProblemReference(problem.title);
  // An existing different source URL may describe a variant: do not mix in a summary.
  const sameSource = !problem.url.trim() || problem.url.replace(/\/$/, '') === reference?.url.replace(/\/$/, '');
  if (!reference || !sameSource) return problem;
  const description = problem.description.trim() ? problem.description : reference.description;
  const url = problem.url.trim() ? problem.url : reference.url;
  const difficulty = problem.difficulty ?? reference.difficulty;
  return description === problem.description && url === problem.url && difficulty === problem.difficulty ? problem : { ...problem, description, url, ...(difficulty ? { difficulty } : {}) };
}
