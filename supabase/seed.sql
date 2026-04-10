-- Seed the course, lessons, lesson steps, and inspiration content.
-- Admin bootstrap pattern:
--   1. Create the account with normal Supabase Auth signup.
--   2. Promote it manually in SQL:
--      update public.users
--      set role = 'admin', onboarding_completed = true
--      where email = 'mentor@example.com';

insert into public.courses (
  id,
  slug,
  title,
  description,
  audience,
  estimated_minutes,
  is_published
) values (
  '10000000-0000-0000-0000-000000000001',
  'computational-thinking-foundations',
  'Computational Thinking Foundations',
  'A beginner-friendly introduction to sequence, output, loops, conditions, and variables with voice-friendly support.',
  'Female students with motor disabilities who are new to block programming',
  80,
  true
)
on conflict (id) do update
set slug = excluded.slug,
    title = excluded.title,
    description = excluded.description,
    audience = excluded.audience,
    estimated_minutes = excluded.estimated_minutes,
    is_published = excluded.is_published;

insert into public.lessons (
  id,
  course_id,
  slug,
  title,
  summary,
  description,
  order_index,
  estimated_minutes,
  is_published
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'start-and-sequence',
    'Lesson 1: Start and Sequence',
    'Understand how a program begins and follows a simple order.',
    'Students learn that a program starts with a clear entry point and then follows blocks from top to bottom.',
    1,
    12,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'print-output',
    'Lesson 2: Print and Output',
    'Use print blocks to communicate ideas with program output.',
    'Students practice making programs display text and connect block actions to visible results.',
    2,
    14,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'repeat-loops',
    'Lesson 3: Repeat Loops',
    'Repeat actions with simple count-based loops.',
    'Students discover how loops reduce repetition and help them build patterns with fewer blocks.',
    3,
    16,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'if-basics',
    'Lesson 4: If Basics',
    'Make programs respond differently based on a condition.',
    'Students begin reading and creating basic if logic with clear true and false outcomes.',
    4,
    18,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    'variables-basics',
    'Lesson 5: Variables Basics',
    'Store and reuse simple values with beginner variable blocks.',
    'Students use a variable block to hold a value, update it, and include it in printed output.',
    5,
    20,
    true
  )
on conflict (id) do update
set course_id = excluded.course_id,
    slug = excluded.slug,
    title = excluded.title,
    summary = excluded.summary,
    description = excluded.description,
    order_index = excluded.order_index,
    estimated_minutes = excluded.estimated_minutes,
    is_published = excluded.is_published;

insert into public.lesson_steps (
  id,
  lesson_id,
  title,
  order_index,
  instructions,
  hints,
  expected_result,
  completion_logic,
  starter_workspace
) values
  (
    '30000000-0000-0000-0000-000000000101',
    '20000000-0000-0000-0000-000000000001',
    'Add the start block',
    1,
    'Add one start block to begin the program.',
    array['Use the start category item first.', 'A program should begin with a start block.'],
    '{"requiredBlocks":["start"]}'::jsonb,
    '{"type":"required_block_types","blockTypes":["start"]}'::jsonb,
    '{"version":1,"blocks":[]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000102',
    '20000000-0000-0000-0000-000000000001',
    'Build a two-block sequence',
    2,
    'Place a print block after the start block to make a short sequence.',
    array['Think about what comes after start.', 'A sequence follows top to bottom.'],
    '{"requiredBlocks":["start","print"]}'::jsonb,
    '{"type":"ordered_block_types","blockTypes":["start","print"]}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000103',
    '20000000-0000-0000-0000-000000000001',
    'Read the sequence',
    3,
    'Check that the program starts first and then prints a message.',
    array['Start should stay at the top.', 'The print block should come after start.'],
    '{"message":"Program begins, then shows one message."}'::jsonb,
    '{"type":"ordered_block_types","blockTypes":["start","print"]}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-print","type":"print","fields":{"text":"Xin chao"}}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000201',
    '20000000-0000-0000-0000-000000000002',
    'Print a greeting',
    1,
    'Add a print block that says "Xin chao".',
    array['Open the output block category.', 'Edit the text field inside the print block.'],
    '{"output":["Xin chao"]}'::jsonb,
    '{"type":"print_text","text":"Xin chao"}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000002',
    'Print two messages in order',
    2,
    'Use two print blocks to show a greeting and then an encouragement.',
    array['You need two print blocks.', 'The order of messages matters.'],
    '{"output":["Xin chao","Ban lam duoc!"]}'::jsonb,
    '{"type":"print_sequence","texts":["Xin chao","Ban lam duoc!"]}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-print","type":"print","fields":{"text":"Xin chao"}}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000203',
    '20000000-0000-0000-0000-000000000002',
    'Match the expected output',
    3,
    'Make the output exactly match the lesson target.',
    array['Read the expected output carefully.', 'Spacing and order should match.'],
    '{"output":["SheCanCode Voice"]}'::jsonb,
    '{"type":"print_text","text":"SheCanCode Voice"}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-print","type":"print","fields":{"text":""}}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000301',
    '20000000-0000-0000-0000-000000000003',
    'Repeat a print block three times',
    1,
    'Add a repeat block set to 3 and place a print block inside it.',
    array['The repeat count should be 3.', 'Put the print block inside the loop.'],
    '{"output":["Tap","Tap","Tap"]}'::jsonb,
    '{"type":"repeat_print","count":3,"text":"Tap"}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000302',
    '20000000-0000-0000-0000-000000000003',
    'Change the repeat value',
    2,
    'Update the repeat block so the message prints 5 times.',
    array['Edit the loop number field.', 'You still need a print block inside the loop.'],
    '{"output":["Co gang len!","Co gang len!","Co gang len!","Co gang len!","Co gang len!"]}'::jsonb,
    '{"type":"repeat_print","count":5,"text":"Co gang len!"}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-repeat","type":"repeat","fields":{"times":3},"children":[{"id":"seed-print","type":"print","fields":{"text":"Co gang len!"}}]}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000303',
    '20000000-0000-0000-0000-000000000003',
    'Compare loop and sequence',
    3,
    'Use one repeat block instead of three separate print blocks.',
    array['Look for a shorter solution.', 'One loop can replace repeated prints.'],
    '{"requiredBlocks":["start","repeat","print"],"maxTopLevelBlocks":2}'::jsonb,
    '{"type":"max_top_level_blocks","blockTypes":["start","repeat"],"max":2}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000401',
    '20000000-0000-0000-0000-000000000004',
    'Add an if block',
    1,
    'Place an if block after start.',
    array['Find the condition block category.', 'The if block comes after start.'],
    '{"requiredBlocks":["start","if"]}'::jsonb,
    '{"type":"required_block_types","blockTypes":["start","if"]}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000402',
    '20000000-0000-0000-0000-000000000004',
    'Print when the condition is true',
    2,
    'Inside the if block, print "Dung".',
    array['Add a print block inside the condition block.', 'Set the text value to Dung.'],
    '{"output":["Dung"]}'::jsonb,
    '{"type":"if_print","text":"Dung"}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-if","type":"if","fields":{"condition":true},"children":[]}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000403',
    '20000000-0000-0000-0000-000000000004',
    'Read simple decision logic',
    3,
    'Make the program show "San sang" only when the condition is true.',
    array['The text belongs inside the if block.', 'Use a clear true condition for this step.'],
    '{"output":["San sang"]}'::jsonb,
    '{"type":"if_print","text":"San sang"}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-if","type":"if","fields":{"condition":true},"children":[{"id":"seed-print","type":"print","fields":{"text":""}}]}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000501',
    '20000000-0000-0000-0000-000000000005',
    'Create a variable block',
    1,
    'Add a variable block named score.',
    array['Use a short variable name.', 'This lesson uses the name score.'],
    '{"requiredBlocks":["start","variable"]}'::jsonb,
    '{"type":"variable_name","name":"score"}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000502',
    '20000000-0000-0000-0000-000000000005',
    'Set the variable value',
    2,
    'Set score to 5.',
    array['Edit the value field inside the variable block.', 'The number should be 5.'],
    '{"variable":{"name":"score","value":5}}'::jsonb,
    '{"type":"variable_value","name":"score","value":5}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-variable","type":"variable","fields":{"name":"score","value":0}}]}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000503',
    '20000000-0000-0000-0000-000000000005',
    'Use the variable in output',
    3,
    'Print the current score after setting it.',
    array['You need both a variable block and a print block.', 'The print should use the updated score value.'],
    '{"output":["5"]}'::jsonb,
    '{"type":"variable_then_print","name":"score","value":5}'::jsonb,
    '{"version":1,"blocks":[{"id":"seed-start","type":"start"},{"id":"seed-variable","type":"variable","fields":{"name":"score","value":5}}]}'::jsonb
  )
on conflict (id) do update
set lesson_id = excluded.lesson_id,
    title = excluded.title,
    order_index = excluded.order_index,
    instructions = excluded.instructions,
    hints = excluded.hints,
    expected_result = excluded.expected_result,
    completion_logic = excluded.completion_logic,
    starter_workspace = excluded.starter_workspace;

insert into public.role_model_entries (
  id,
  name,
  headline,
  summary,
  story,
  quote,
  image_path,
  sort_order,
  is_published
) values
  (
    '40000000-0000-0000-0000-000000000001',
    'Ada Lovelace',
    'Early computing pioneer',
    'Ada Lovelace imagined how machines could follow symbolic instructions long before modern software existed.',
    'Ada Lovelace wrote about how Charles Babbage''s analytical engine could process symbols, not only numbers. Her work helps students see that coding begins with ideas, patterns, and imagination.',
    'Your ideas belong in technology.',
    null,
    1,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Dr. Fei-Fei Li',
    'Computer scientist and AI educator',
    'Fei-Fei Li combines research, teaching, and advocacy to make technology more human-centered and inclusive.',
    'Dr. Fei-Fei Li has led major advances in artificial intelligence while also speaking about ethics, education, and access. Her path shows that technical excellence and empathy can grow together.',
    'Technology needs both skill and compassion.',
    null,
    2,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'Haben Girma',
    'Disability rights advocate and educator',
    'Haben Girma shows how accessibility and determination can open doors in education, law, and technology.',
    'Haben Girma became the first Deafblind graduate of Harvard Law School and has worked globally on disability access. Her story reinforces that barriers should be designed away, not accepted.',
    'Access is part of excellence.',
    null,
    3,
    true
  )
on conflict (id) do update
set name = excluded.name,
    headline = excluded.headline,
    summary = excluded.summary,
    story = excluded.story,
    quote = excluded.quote,
    image_path = excluded.image_path,
    sort_order = excluded.sort_order,
    is_published = excluded.is_published;
