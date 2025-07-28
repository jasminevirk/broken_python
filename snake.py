import pygame
import random
import sys
import keyword

# Game states
ST_SPLASH, ST_DEVLOGO, ST_MENU, ST_SETTINGS, ST_CREDITS, ST_PLAY, ST_LEVEL_COMPLETE, ST_GAME_OVER, ST_GAME_COMPLETE = range(9)

# Initialize
pygame.init()
info = pygame.display.Info()
WIDTH, HEIGHT = info.current_w, info.current_h
SCREEN = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("🐍 Broken Python 🐍")
clock = pygame.time.Clock()

# Constants
CELL_SIZE = 60
CONSOLE_RATIO = 0.15
CONSOLE_HEIGHT = int(HEIGHT * CONSOLE_RATIO)
PLAY_AREA_Y = CONSOLE_HEIGHT
GRID_WIDTH = WIDTH // CELL_SIZE
GRID_HEIGHT = (HEIGHT - PLAY_AREA_Y) // CELL_SIZE
MAX_LIVES = 3
LEVEL_COUNT = 5

# Snake speed control: moves per second
SNAKE_SPEED = 5  # adjust this to speed up/slow down
MOVE_EVENT = pygame.USEREVENT + 1
pygame.time.set_timer(MOVE_EVENT, 1000 // SNAKE_SPEED)

# Assets
splash_img = pygame.image.load('assets/sprites/splash.png').convert()
devlogo_img = pygame.image.load('assets/sprites/devlogo.png').convert_alpha()
main_menu_splash_img = pygame.image.load('assets/sprites/main_menu_splash.png').convert_alpha()
# scale main menu splash to cover full screen
main_menu_splash_img = pygame.transform.smoothscale(main_menu_splash_img, (WIDTH, HEIGHT))
menu_music = 'assets/audio/menu_music.mp3'
game_music = 'assets/audio/game_music.mp3'
boss_music = 'assets/audio/boss_music.mp3'
# SFX
eat_sfx = pygame.mixer.Sound('assets/audio/eat.mp3')
bump_sfx = pygame.mixer.Sound('assets/audio/console_bump.mp3')
crash_sfx = pygame.mixer.Sound('assets/audio/crash_into_wall.mp3')
overflow_sfx = pygame.mixer.Sound('assets/audio/console_overflow.mp3')
level_sfx = pygame.mixer.Sound('assets/audio/level_complete.mp3')
complete_sfx = pygame.mixer.Sound('assets/audio/game_complete.mp3')
gameover_sfx = pygame.mixer.Sound('assets/audio/game_over.mp3')
click_sfx = pygame.mixer.Sound('assets/audio/menu_button.mp3')
sfx_sounds = [eat_sfx, bump_sfx, crash_sfx, overflow_sfx, level_sfx, complete_sfx, gameover_sfx, click_sfx]

# Set default volume
pygame.mixer.music.set_volume(0.5)
for sfx in sfx_sounds:
    sfx.set_volume(0.5)

# Snake asset
snake_head_img = pygame.image.load('assets/sprites/snake_head.png').convert_alpha()
snake_body_img = pygame.image.load('assets/sprites/snake_body.png').convert_alpha()
snake_tail_img = pygame.image.load('assets/sprites/snake_tail.png').convert_alpha()
snake_corner_img = pygame.image.load('assets/sprites/snake_corner.png').convert_alpha()
snake_head = pygame.transform.scale(snake_head_img, (CELL_SIZE, CELL_SIZE))
snake_body = pygame.transform.scale(snake_body_img, (CELL_SIZE, CELL_SIZE))
snake_tail = pygame.transform.scale(snake_tail_img, (CELL_SIZE, CELL_SIZE))
snake_corner = pygame.transform.scale(snake_corner_img, (CELL_SIZE, CELL_SIZE))

# Enemy asset
enemy_img = pygame.image.load('assets/sprites/enemy_head.png').convert_alpha()
enemy_sprite = pygame.transform.scale(enemy_img, (CELL_SIZE, CELL_SIZE))
enemy_offset = (0, 0)

# Fonts
font_title = pygame.font.SysFont('monospace', 48)
font_menu = pygame.font.SysFont('monospace', 32)
font_log = pygame.font.SysFont('monospace', 20)
font_key = pygame.font.SysFont('monospace', 20, bold=True)
font_problem = pygame.font.SysFont('monospace', 18)

# Buttons
def make_button(txt, y): return pygame.Rect(WIDTH - 320, 50 + y, 300, 50)
btn_play = make_button('Play', 0)
btn_settings = make_button('Settings', 70)
btn_credits = make_button('Credits', 140)
btn_quit = make_button('Quit', 210)
btn_back = pygame.Rect(40, HEIGHT - 80, 100, 40)
btn_continue = pygame.Rect(WIDTH//2-100, PLAY_AREA_Y+GRID_HEIGHT*CELL_SIZE//2, 200, 50)
btn_retry = pygame.Rect(WIDTH//2-160, PLAY_AREA_Y+GRID_HEIGHT*CELL_SIZE//2, 150, 50)
btn_menu = pygame.Rect(WIDTH//2+10, PLAY_AREA_Y+GRID_HEIGHT*CELL_SIZE//2, 150, 50)

# Sliders
slider_music_rect = pygame.Rect(300, 205, 200, 10)
slider_sfx_rect = pygame.Rect(300, 255, 200, 10)

# Levels
development_levels = [
    {'template':'_____("Hello, World!")',   'required':['print'], 'options':['print','echo','write','display']},
    {'template':'if a > b: _____', 'required':['pass'], 'options':['pass','continue','break','return']},
    {'template':'for i in _____(5):', 'required':['range'], 'options':['range','loop','go','iter']},
    {'template':'_____ my_func():\n  _____ "Hello"', 'required':['def','return'], 'options':['def','return','func','void']},
    {'template':'while True:\n  _____', 'required':['break'], 'options':['break','stop','exit','continue']}
]

# State vars
state = ST_SPLASH
splash_start = pygame.time.get_ticks()
devlogo_start = 0
game_complete_start = 0
level = 0
lives = MAX_LIVES
snake = [(5,5)]
direction = (1,0)
keyword_tiles = []
collected = []
event_log = []
shake = 0
enemy_pos = None
enemy_frozen = False
selected_slider = None

# Helpers
def play_music(music_file):
    pygame.mixer.music.load(music_file)
    pygame.mixer.music.play(-1)

# Setup play state
def setup_play():
    global snake, direction, keyword_tiles, collected, lives, event_log, enemy_pos, enemy_frozen
    snake = [(5, 5), (4, 5), (3, 5)]
    direction = (1,0)
    collected.clear()
    lives = MAX_LIVES
    event_log.clear()
    keyword_tiles.clear()
    opts = development_levels[level]['options']
    for kw in opts:
        surf = font_key.render(kw, True, (50,200,50))
        w,h = surf.get_size()
        offs = ((w-CELL_SIZE)//2, (h-CELL_SIZE)//2)
        while True:
            x = random.randrange(1, GRID_WIDTH - 1)
            y = random.randrange(1, GRID_HEIGHT - 1)
            
            too_close = False
            for t in keyword_tiles:
                dist = abs(x - t['pos'][0]) + abs(y - t['pos'][1])
                if dist < 3:
                    too_close = True
                    break
            
            if not too_close and (x,y) not in snake:
                rect = pygame.Rect(x * CELL_SIZE - offs[0], y * CELL_SIZE + PLAY_AREA_Y - offs[1], w, h)
                keyword_tiles.append({'text':kw,'surf':surf,'pos':(x,y),'offs':offs, 'rect': rect})
                break
    if level == 4:
        enemy_pos = [GRID_WIDTH-5, GRID_HEIGHT-5]
        enemy_frozen = False
    play_music(game_music)

# Draw functions
def blit_cell(spr, offs, x, y):
    SCREEN.blit(spr, (x*CELL_SIZE-offs[0], y*CELL_SIZE+PLAY_AREA_Y-offs[1]))

def draw_console():
    global shake
    dx = random.randint(-5,5) if shake>0 else 0
    shake = max(shake-1,0)
    pygame.draw.rect(SCREEN, (30,30,30), (dx,0,WIDTH,CONSOLE_HEIGHT))
    pygame.draw.rect(SCREEN, (200,200,200), (dx,0,WIDTH,CONSOLE_HEIGHT), 2)
    
    template = development_levels[level]['template']
    num_blanks = template.count('_____')
    
    # Create a list of collected keywords to fill in the blanks
    fill_ins = collected + ['_____'] * (num_blanks - len(collected))
    
    # Replace placeholders with collected keywords
    # This is a bit tricky since str.replace is not indexed
    parts = template.split('_____')
    result = ""
    for i, part in enumerate(parts):
        result += part
        if i < len(fill_ins):
            result += fill_ins[i]

    # Render line by line
    y_offset = 10
    for line in result.split('\n'):
        SCREEN.blit(font_problem.render(line, True, (240,240,240)), (10+dx, y_offset))
        y_offset += 25

    for i,msg in enumerate(event_log[-5:]):
        SCREEN.blit(font_log.render(msg, True, (255,255,255)), (10+dx,70+i*30))

def draw_border():
    pygame.draw.rect(SCREEN, (200,200,200), (0,PLAY_AREA_Y,GRID_WIDTH*CELL_SIZE,GRID_HEIGHT*CELL_SIZE), 4)

def draw_snake():
    for i, (x, y) in enumerate(snake):
        if i == 0:  # Head
            ang = {(1, 0): 270, (-1, 0): 90, (0, 1): 180, (0, -1): 0}[direction]
            blit_cell(pygame.transform.rotate(snake_head, ang), (0,0), x, y)
        elif i == len(snake) - 1:  # Tail
            px, py = snake[i-1]
            tail_dir = (px - x, py - y)
            ang = 0
            if tail_dir == (1,0): ang = 90
            elif tail_dir == (-1,0): ang = 270
            elif tail_dir == (0,1): ang = 0
            else: ang = 180
            blit_cell(pygame.transform.rotate(snake_tail, ang), (0,0), x, y)
        else:  # Body
            px, py = snake[i-1]
            nx, ny = snake[i+1]
            if px == nx: # Vertical
                ang = 90
            elif py == ny: # Horizontal
                ang = 0
            else: # Corner
                prev_v = (px - x, py - y)
                next_v = (nx - x, ny - y)
                if (prev_v, next_v) in [((0,-1),(1,0)), ((1,0),(0,-1))]: ang = 270    # up-right
                elif (prev_v, next_v) in [((1,0),(0,1)), ((0,1),(1,0))]: ang = 180  # right-down
                elif (prev_v, next_v) in [((0,1),(-1,0)), ((-1,0),(0,1))]: ang = 90 # down-left
                elif (prev_v, next_v) in [((-1,0),(0,-1)), ((0,-1),(-1,0))]: ang = 0   # left-up
                blit_cell(pygame.transform.rotate(snake_corner, ang), (0,0), x, y)
                continue
            blit_cell(pygame.transform.rotate(snake_body, ang), (0,0), x, y)

def draw_tiles():
    for t in keyword_tiles:
        blit_cell(t['surf'], t['offs'], *t['pos'])

def draw_enemy():
    if enemy_pos is not None:
        blit_cell(enemy_sprite, enemy_offset, *enemy_pos)

def draw_score():
    text = f"Lives:{lives} Collected:{len(collected)}/{len(development_levels[level]['required'])}"
    SCREEN.blit(font_log.render(text, True, (255,255,255)), (10, PLAY_AREA_Y+10))

def draw_menu():
    # draw main menu background, centered horizontally
    SCREEN.blit(main_menu_splash_img, (0, 0))
    # Menu buttons
    for btn, text in [(btn_play,'Play'), (btn_settings,'Settings'), (btn_credits,'Credits'), (btn_quit,'Quit')]:
        pygame.draw.rect(SCREEN, (100,100,200), btn)
        SCREEN.blit(font_menu.render(text, True, (255,255,255)), (btn.x+60, btn.y+10))
    # note: main_menu_splash_img already drawn as full-screen background
    # draw background splash scaled behind buttons (if desired)

def draw_settings():
    global selected_slider
    SCREEN.fill((20,20,20))
    SCREEN.blit(font_title.render('Settings', True, (255,255,255)), (WIDTH//2-100,100))
    
    # Music Volume
    SCREEN.blit(font_log.render(f"Music Vol: {pygame.mixer.music.get_volume():.2f}", True, (255,255,255)), (100,200))
    pygame.draw.rect(SCREEN, (100,100,100), slider_music_rect)
    music_vol_pos = slider_music_rect.x + int(pygame.mixer.music.get_volume() * slider_music_rect.width)
    pygame.draw.rect(SCREEN, (200,200,255), (music_vol_pos - 5, slider_music_rect.y - 5, 10, 20))
    if selected_slider == 'music':
        pygame.draw.rect(SCREEN, (255,255,0), slider_music_rect, 2)

    # SFX Volume
    SCREEN.blit(font_log.render(f"SFX Vol: {eat_sfx.get_volume():.2f}", True, (255,255,255)), (100,250))
    pygame.draw.rect(SCREEN, (100,100,100), slider_sfx_rect)
    sfx_vol_pos = slider_sfx_rect.x + int(eat_sfx.get_volume() * slider_sfx_rect.width)
    pygame.draw.rect(SCREEN, (200,200,255), (sfx_vol_pos - 5, slider_sfx_rect.y - 5, 10, 20))
    if selected_slider == 'sfx':
        pygame.draw.rect(SCREEN, (255,255,0), slider_sfx_rect, 2)

    pygame.draw.rect(SCREEN, (100,100,200), btn_back)
    SCREEN.blit(font_menu.render('Back', True, (255,255,255)), (btn_back.x+10, btn_back.y+5))

def draw_credits():
    SCREEN.fill((20,0,0))
    lines = ['Developed by Jaz, Onu & Chammi', 'For Boot.dev Hackathon']
    for i,l in enumerate(lines):
        SCREEN.blit(font_log.render(l, True, (255,255,255)), (100,200+i*40))
    pygame.draw.rect(SCREEN, (100,100,200), btn_back)
    SCREEN.blit(font_menu.render('Back', True, (255,255,255)), (btn_back.x+10, btn_back.y+5))

def draw_game_over():
    SCREEN.fill((0,0,0))
    SCREEN.blit(font_title.render('Game Over', True, (255,0,0)), (WIDTH//2-200,HEIGHT//2-50))
    gameover_sfx.play()

def draw_game_complete():
    SCREEN.fill((0,0,0))
    SCREEN.blit(font_title.render('Congratulations!', True, (255,255,0)), (WIDTH//2-300,HEIGHT//2-50))
    complete_sfx.play()

# Movement & logic
def move_snake():
    global shake, lives, state, direction
    hx, hy = snake[0]
    head = (hx + direction[0], hy + direction[1])
    snake.insert(0, head)
    head_rect = pygame.Rect(head[0] * CELL_SIZE, head[1] * CELL_SIZE + PLAY_AREA_Y, CELL_SIZE, CELL_SIZE)
    
    ate_keyword = False
    for t in keyword_tiles:
        if t['rect'].colliderect(head_rect):
            ate_keyword = True
            collected.append(t['text'])
            keyword_tiles.remove(t)
            eat_sfx.play()
            if level == 4 and t['text'] == 'break':
                global state, game_complete_start
                state = ST_GAME_COMPLETE
                game_complete_start = pygame.time.get_ticks()
                complete_sfx.play()
                return
            break
    
    x, y = head
    if y < 0:  # console bounce
        if level == 4 and enemy_frozen:
            if set(collected) == set(development_levels[level]['required']):
                state = ST_LEVEL_COMPLETE
                level_sfx.play()
                return
        shake = 10
        bump_sfx.play()
        if collected:
            rem = collected.pop()
            event_log.append(f"Replaced: {rem}")
            surf = font_key.render(rem, True, (50,200,50))
            w,h = surf.get_size(); offs = ((w-CELL_SIZE)//2,(h-CELL_SIZE)//2)
            while True:
                rx = random.randrange(GRID_WIDTH)
                ry = random.randrange(GRID_HEIGHT)
                if (rx,ry) not in snake and all(tt['pos'] != (rx,ry) for tt in keyword_tiles):
                    rect = pygame.Rect(rx * CELL_SIZE - offs[0], ry * CELL_SIZE + PLAY_AREA_Y - offs[1], w, h)
                    keyword_tiles.append({'text':rem,'surf':surf,'pos':(rx,ry),'offs':offs, 'rect': rect})
                    break
        snake[0] = (x,0)
        direction = random.choice([(-1,0),(1,0)])
    
    elif x < 0 or x >= GRID_WIDTH or y >= GRID_HEIGHT:  # wall collision
        lives -= 1
        crash_sfx.play()
        if lives <= 0:
            state = ST_GAME_OVER
            play_music(None)
        else:
            setup_play()
        return
    if level == 4 and state == ST_PLAY and enemy_pos is not None and not enemy_frozen:  # enemy chase
        ex, ey = enemy_pos
        hx, hy = snake[0]
        dx, dy = hx - ex, hy - ey
        
        step_x = 0
        step_y = 0

        # Decide horizontal or vertical move
        if abs(dx) > abs(dy):
            step_x = 1 if dx > 0 else -1
        elif abs(dy) > 0:
            step_y = 1 if dy > 0 else -1
        
        # To make it non-diagonal, we can randomly choose one direction if both are possible
        if dx != 0 and dy != 0:
            if random.choice([True, False]):
                step_y = 0 # move horizontally
            else:
                step_x = 0 # move vertically
        elif dx != 0:
            step_y = 0
        elif dy != 0:
            step_x = 0

        enemy_pos[0] += step_x
        enemy_pos[1] += step_y
        if (enemy_pos[0], enemy_pos[1]) == head:
            lives -= 1
            crash_sfx.play()
            if lives <= 0:
                state = ST_GAME_OVER
                play_music(None)
            else:
                setup_play()
            return

    if not ate_keyword:
        snake.pop()
        
    if state != ST_GAME_COMPLETE and set(collected) == set(development_levels[level]['required']):
        level_sfx.play()
        state = ST_LEVEL_COMPLETE

# Input handling
def handle_play_events(ev):
    global direction, state
    if ev.type == pygame.KEYDOWN:
        if ev.key == pygame.K_UP and direction != (0,1):
            direction = (0,-1)
        if ev.key == pygame.K_DOWN and direction != (0,-1):
            direction = (0,1)
        if ev.key == pygame.K_LEFT and direction != (1,0):
            direction = (-1,0)
        if ev.key == pygame.K_RIGHT and direction != (-1,0):
            direction = (1,0)
        if ev.key == pygame.K_ESCAPE:
            state = ST_MENU
            play_music(menu_music)

# Initialize play state
setup_play()
play_music(menu_music)

# Main loop
while True:
    for ev in pygame.event.get():
        if ev.type == pygame.QUIT:
            pygame.quit()
            sys.exit()
        if state == ST_MENU:
            if ev.type == pygame.MOUSEBUTTONDOWN:
                mx, my = ev.pos
                click_sfx.play()
                if btn_play.collidepoint(mx,my):
                    state = ST_PLAY
                    setup_play()
                elif btn_settings.collidepoint(mx,my):
                    state = ST_SETTINGS
                    selected_slider = 'music'
                elif btn_credits.collidepoint(mx,my):
                    state = ST_CREDITS
                elif btn_quit.collidepoint(mx,my):
                    pygame.quit()
                    sys.exit()
        elif state == ST_SETTINGS:
            if ev.type == pygame.MOUSEBUTTONDOWN:
                if btn_back.collidepoint(ev.pos):
                    state = ST_MENU
                    selected_slider = None
                elif slider_music_rect.collidepoint(ev.pos):
                    selected_slider = 'music'
                    pos = ev.pos[0] - slider_music_rect.x
                    vol = max(0.0, min(1.0, pos / slider_music_rect.width))
                    pygame.mixer.music.set_volume(vol)
                elif slider_sfx_rect.collidepoint(ev.pos):
                    selected_slider = 'sfx'
                    pos = ev.pos[0] - slider_sfx_rect.x
                    vol = max(0.0, min(1.0, pos / slider_sfx_rect.width))
                    for sfx in sfx_sounds:
                        sfx.set_volume(vol)
                else:
                    selected_slider = None
            elif ev.type == pygame.MOUSEMOTION:
                if ev.buttons[0]:  # Left mouse button held down
                    if selected_slider == 'music' and slider_music_rect.collidepoint(ev.pos):
                        pos = ev.pos[0] - slider_music_rect.x
                        vol = max(0.0, min(1.0, pos / slider_music_rect.width))
                        pygame.mixer.music.set_volume(vol)
                    elif selected_slider == 'sfx' and slider_sfx_rect.collidepoint(ev.pos):
                        pos = ev.pos[0] - slider_sfx_rect.x
                        vol = max(0.0, min(1.0, pos / slider_sfx_rect.width))
                        for sfx in sfx_sounds:
                            sfx.set_volume(vol)
            elif ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_UP:
                    if selected_slider == 'sfx':
                        selected_slider = 'music'
                elif ev.key == pygame.K_DOWN:
                    if selected_slider == 'music':
                        selected_slider = 'sfx'
                elif selected_slider == 'music':
                    vol = pygame.mixer.music.get_volume()
                    if ev.key == pygame.K_LEFT:
                        vol = max(0.0, vol - 0.1)
                    elif ev.key == pygame.K_RIGHT:
                        vol = min(1.0, vol + 0.1)
                    pygame.mixer.music.set_volume(vol)
                elif selected_slider == 'sfx':
                    vol = eat_sfx.get_volume()
                    if ev.key == pygame.K_LEFT:
                        vol = max(0.0, vol - 0.1)
                    elif ev.key == pygame.K_RIGHT:
                        vol = min(1.0, vol + 0.1)
                    for sfx in sfx_sounds:
                        sfx.set_volume(vol)
        elif state == ST_CREDITS:
            if ev.type == pygame.MOUSEBUTTONDOWN and btn_back.collidepoint(ev.pos):
                state = ST_MENU
        elif state == ST_PLAY:
            handle_play_events(ev)
            if ev.type == MOVE_EVENT:
                move_snake()
        elif state == ST_LEVEL_COMPLETE:
            if ev.type == pygame.MOUSEBUTTONDOWN and btn_continue.collidepoint(ev.pos):
                level += 1
                state = ST_PLAY
                setup_play()
        elif state == ST_GAME_OVER:
            if ev.type == pygame.MOUSEBUTTONDOWN:
                mx,my = ev.pos
                if btn_retry.collidepoint(mx,my):
                    state = ST_PLAY
                    setup_play()
                elif btn_menu.collidepoint(mx,my):
                    state = ST_MENU
                    play_music(menu_music)
        elif state == ST_GAME_COMPLETE:
            if pygame.time.get_ticks() - game_complete_start > 3000:
                state = ST_MENU
                play_music(menu_music)

    SCREEN.fill((0,0,0))
    if state == ST_SPLASH:
        SCREEN.fill((0,0,0))
        # center splash
        SCREEN.blit(splash_img, (WIDTH//2 - splash_img.get_width()//2, HEIGHT//2 - splash_img.get_height()//2))
        if pygame.time.get_ticks() - splash_start > 2000:
            state = ST_DEVLOGO
            devlogo_start = pygame.time.get_ticks()
    elif state == ST_DEVLOGO:
        SCREEN.fill((0,0,0))
        SCREEN.blit(devlogo_img,(WIDTH//2-devlogo_img.get_width()//2,HEIGHT//2-devlogo_img.get_height()//2))
        if pygame.time.get_ticks() - devlogo_start > 2000:
            state = ST_MENU
            play_music(menu_music)
    elif state == ST_MENU:
        draw_menu()
    elif state == ST_SETTINGS:
        draw_settings()
    elif state == ST_CREDITS:
        draw_credits()
    elif state == ST_PLAY:
        SCREEN.fill(pygame.Color("#181d29"), (0, PLAY_AREA_Y, WIDTH, HEIGHT - PLAY_AREA_Y))
        draw_console()
        draw_border()
        draw_snake()
        draw_tiles()
        draw_score()
        if level == 4:
            draw_enemy()
    elif state == ST_LEVEL_COMPLETE:
        SCREEN.fill((0,0,0))
        SCREEN.blit(font_title.render('Level Complete!',True,(0,255,0)),(WIDTH//2-200,HEIGHT//2-50))
        pygame.draw.rect(SCREEN,(100,200,100),btn_continue)
        SCREEN.blit(font_menu.render('Continue',True,(0,0,0)),(btn_continue.x+25,btn_continue.y+10))
    elif state == ST_GAME_OVER:
        draw_game_over()
        pygame.draw.rect(SCREEN,(200,100,100),btn_retry)
        SCREEN.blit(font_menu.render('Retry',True,(0,0,0)),(btn_retry.x+25,btn_retry.y+10))
        pygame.draw.rect(SCREEN,(100,100,200),btn_menu)
        SCREEN.blit(font_menu.render('Menu',True,(255,255,255)),(btn_menu.x+25,btn_menu.y+10))
    elif state == ST_GAME_COMPLETE:
        draw_game_complete()

    pygame.display.flip()
