-- 004_seed_badges.sql
-- Insert all 13 badge definitions

INSERT INTO badges (id, name, description, rarity) VALUES
    ('champion',    'Champion',           'Won an arena',                                      'legendary'),
    ('gladiator',   'Gladiator',          'Finished 2nd in an arena',                          'epic'),
    ('warrior',     'Warrior',            'Finished 3rd in an arena',                          'epic'),
    ('survivor',    'Survivor',           'Survived all rounds',                               'rare'),
    ('almost',      'Almost!',            'Last trader eliminated before finals',               'rare'),
    ('strategist',  'Strategist',         'Highest Sharpe Ratio in an arena',                  'epic'),
    ('fan_favorite','Fan Favorite',       'Most Second Life votes in an arena',                'rare'),
    ('first_blood', 'First Blood',        'First elimination in an arena',                     'common'),
    ('iron_will',   'Iron Will',          'Used Second Life and still survived the round',     'epic'),
    ('streak_3',    'Hot Streak',         'Won 3 arenas in a row',                             'legendary'),
    ('veteran_10',  'Veteran',            'Entered 10 arenas',                                 'common'),
    ('veteran_50',  'Gladiator Veteran',  'Entered 50 arenas',                                 'rare'),
    ('zero_dd',     'Untouchable',        'Won a round with 0% drawdown',                      'legendary');
