/* PIXELDEX 引擎：图样库 + 词库匹配 + 程序生成，不碰 DOM */

/* =========================================================================
   PIXELDEX — 16×16 sprite maker
   两条路: 1) 词库命中 → 手绘图样  2) 未命中 → 按词的哈希铸造专属符号
   ========================================================================= */
const N = 16;

/* ---------- 手绘图样库 ----------
   每格一个字符; '.' 透明; 其余字符在 pal 里定义颜色 */
const LIB = [
{k:'cat',cn:'猫',en:'cat',names:['猫','猫咪','小猫','喵','猫猫','cat','kitty','kitten'],
 pal:{K:'#2A1B12',A:'#F2A24C',B:'#C9752B',W:'#FFFFFF',E:'#2F7D5E',P:'#F0879C'},
 px:['................',
     '..KK........KK..',
     '..KAK......KAK..',
     '..KAAK....KAAK..',
     '..KAAAKKKKAAAK..',
     '.KAAAABBBBAAAAK.',
     'KAAAAAAAAAAAAAAK',
     'KAAWEAAAAAAEWAAK',
     'KAAEEAAAAAAEEAAK',
     'KAAAAAAPPAAAAAAK',
     'KAAAAAKAAKAAAAAK',
     'KAAAAAAKKAAAAAAK',
     '.KAAAAAAAAAAAAK.',
     '..KAAAAAAAAAAK..',
     '...KKKKKKKKKK...',
     '................']},

{k:'heart',cn:'心',en:'heart',names:['心','爱心','爱','喜欢','心心','heart','love'],
 pal:{K:'#4A0F22',A:'#FF4D6D',C:'#FF9BB0',B:'#C21B45'},
 px:['................',
     '...KKKK..KKKK...',
     '..KCCAAKKAAAAK..',
     '.KCCAAAAAAAAAAK.',
     '.KCAAAAAAAAAAAK.',
     '.KAAAAAAAAAAABK.',
     '.KAAAAAAAAAAABK.',
     '..KAAAAAAAAABK..',
     '..KAAAAAAAAABK..',
     '...KAAAAAAABK...',
     '....KAAAAABK....',
     '.....KAAABK.....',
     '......KABK......',
     '.......KK.......',
     '................',
     '................']},

{k:'star',cn:'星',en:'star',names:['星','星星','明星','star','stars'],
 pal:{K:'#5C4008',A:'#FFD24D',C:'#FFF0A8',B:'#E0A310'},
 px:['................',
     '.......KK.......',
     '......KCCK......',
     '......KCCK......',
     '.....KCAAK......',
     'KKKKKKCAAKKKKKKK',
     'KCCCCCAAAAAAAABK',
     '.KCCAAAAAAAAABK.',
     '..KCAAAAAAAABK..',
     '..KAAAAAAAAABK..',
     '.KAAAAKKKKAABBK.',
     '.KAAAK....KABBK.',
     'KAAAK......KABBK',
     'KAAK........KABK',
     'KK............KK',
     '................']},

{k:'tree',cn:'树',en:'tree',names:['树','大树','森林','树木','tree','forest','wood'],
 pal:{K:'#12301C',A:'#54B366',C:'#8FE39B',B:'#2E7A45',T:'#8A5A32'},
 px:['......KKKK......',
     '....KKCCCAKK....',
     '...KCCAAAAABK...',
     '..KCCAAAAAAABK..',
     '..KCAAAAAAAABK..',
     '.KCAAAAAAAAAABK.',
     '.KCAAAAAAAAABBK.',
     '..KAAAAAAAABBK..',
     '...KAAAAAABBK...',
     '....KKAAABKK....',
     '......KTTK......',
     '......KTTK......',
     '......KTTK......',
     '.....KTTTTK.....',
     '....KKKKKKKK....',
     '................']},

{k:'house',cn:'房子',en:'house',names:['房子','家','屋','房','住','house','home'],
 pal:{K:'#2B1B2E',R:'#E0574F',W:'#EDE3D0',G:'#5AC8E0',D:'#8A5A32',B:'#B33F3A'},
 px:['................',
     '................',
     '.......KK.......',
     '......KRRK......',
     '.....KRRRRK.....',
     '....KRRRRBBK....',
     '...KRRRRRBBBK...',
     '..KRRRRRRBBBBK..',
     '.KKKKKKKKKKKKKK.',
     '..KWWWWWWWWWWK..',
     '..KWGGWWWWWWWK..',
     '..KWGGWWWDDWWK..',
     '..KWWWWWWDDWWK..',
     '..KWWWWWWDDWWK..',
     '..KKKKKKKKKKKK..',
     '................']},

{k:'rocket',cn:'火箭',en:'rocket',names:['火箭','起飞','上天','发射','rocket','launch'],
 pal:{K:'#241C34',A:'#EDE9DC',B:'#B9B0C9',G:'#4FC3F7',R:'#FF5C5C',F:'#FF8A3D',Y:'#FFE066'},
 px:['.......KK.......',
     '......KAAK......',
     '......KABK......',
     '.....KAAABK.....',
     '.....KAAABK.....',
     '....KAAGGABK....',
     '....KAGGGGBK....',
     '....KAGGGGBK....',
     '....KAAGGABK....',
     '....KAAAAABK....',
     '..KRKAAAAABKRK..',
     '.KRRKAAAAABKRRK.',
     'KRRRKAAAAABKRRRK',
     'KKKKKKAAAAKKKKKK',
     '.....KFYYFK.....',
     '......KFFK......']},

{k:'ghost',cn:'幽灵',en:'ghost',names:['幽灵','鬼','鬼魂','ghost','spirit','boo'],
 pal:{K:'#241C34',A:'#EDE9DC',B:'#B9B0C9',P:'#FF7A9C'},
 px:['................',
     '.....KKKKKK.....',
     '...KKAAAAAAKK...',
     '..KAAAAAAAAAAK..',
     '.KAAAAAAAAAAABK.',
     'KAAAKKAAAAKKAABK',
     'KAAAKKAAAAKKAABK',
     'KAAAAAAAAAAAAABK',
     'KAAAAAAAAAAAAABK',
     'KAAPAAKKKKAAPABK',
     'KAAAAAAAAAAAAABK',
     'KAAAAAAAAAAAAABK',
     'KAAAAAAAAAAAABBK',
     'KAAAAAAAAAAABBBK',
     'KAAKKAAAAAAKKABK',
     'KKK..KKKKKK..KKK']},

{k:'mushroom',cn:'蘑菇',en:'mushroom',names:['蘑菇','菌','菇','mushroom','fungi','1up'],
 pal:{K:'#3A1414',R:'#E8443C',W:'#F6EFE0',B:'#B22B2B',S:'#D9CDB4'},
 px:['................',
     '....KKKKKKKK....',
     '..KKRRRRRRRRKK..',
     '.KRRWWRRRRWWRRK.',
     'KRRWWWRRRRWWWBBK',
     'KRRRWWRRRRWWRBBK',
     'KRRRRRRWWRRRRBBK',
     'KKKKKKKKKKKKKKKK',
     '....KWWWWWWK....',
     '....KWWSSWWK....',
     '....KWWSSWWK....',
     '....KWWWWWWK....',
     '...KWWWWWWWWK...',
     '...KWWSSSSWWK...',
     '...KKKKKKKKKK...',
     '................']},

{k:'coffee',cn:'咖啡',en:'coffee',names:['咖啡','拿铁','美式','醒','coffee','latte','espresso'],
 pal:{K:'#2A1B12',W:'#EDE9DC',B:'#6B3E1E',L:'#C9BEA8',S:'#74E0C0'},
 px:['...S..S..S......',
     '...S..S..S......',
     '....S..S..S.....',
     '................',
     '.KKKKKKKKKKK....',
     '.KBBBBBBBBBK....',
     '.KBBBBBBBBLKKKK.',
     '.KWWWWWWWWLKK.K.',
     '.KWWWWWWWWLKK.K.',
     '.KWWWWWWWWLKKKK.',
     '.KWWWWWWWWLK....',
     '.KWWWWWWWWLK....',
     '..KWWWWWWLK.....',
     '..KKKKKKKKK.....',
     '................',
     '................']},

{k:'crown',cn:'皇冠',en:'crown',names:['皇冠','王冠','国王','王','冠军','第一','crown','king','win'],
 pal:{K:'#4A3208',A:'#FFC94D',B:'#D89A16',G:'#FF7A9C',C:'#FFE9A8'},
 px:['................',
     '................',
     '................',
     '.KK....KK....KK.',
     '.KAK..KAAK..KAK.',
     '.KAAK.KAAK.KAAK.',
     '.KAAAKKAAKKAAAK.',
     '.KAAAAAAAAAAAAK.',
     '.KAAGAAGGAAGAAK.',
     '.KAAAAAAAAAAAAK.',
     '.KCCCCCCCCCCCCK.',
     '.KBBBBBBBBBBBBK.',
     '.KKKKKKKKKKKKKK.',
     '................',
     '................',
     '................']},

{k:'fish',cn:'鱼',en:'fish',names:['鱼','小鱼','钓鱼','海','fish','sea'],
 pal:{K:'#0F2A38',A:'#3FBFD6',B:'#1E7E96',C:'#9BE8F2',E:'#0F2A38',W:'#FFFFFF'},
 px:['................',
     '................',
     '................',
     '................',
     '................',
     '....KKKKKK....KK',
     '..KKCAAAAAKK.KAK',
     '.KCWEAAAAAAKKAAK',
     'KCAAAAAAAAAKAAAK',
     '.KCAAAAAABAKKAAK',
     '..KKCAABBAKK.KAK',
     '....KKKKKK....KK',
     '................',
     '................',
     '................',
     '................']},

{k:'skull',cn:'骷髅',en:'skull',names:['骷髅','头骨','死','危险','毒','skull','death','danger'],
 pal:{K:'#241C34',W:'#EDE9DC',B:'#B9B0C9'},
 px:['................',
     '...KKKKKKKKKK...',
     '..KWWWWWWWWWWK..',
     '.KWWWWWWWWWWWBK.',
     'KWWWWWWWWWWWWBBK',
     'KWWKKKWWWWKKKWBK',
     'KWWKKKWWWWKKKWBK',
     'KWWWKKWWWWKKWWBK',
     '.KWWWWWWWWWWWBK.',
     '..KWWWWKKWWWWBK.',
     '..KWWWWWWWWWBK..',
     '...KKWWWWWWKK...',
     '....KWKWWKWK....',
     '....KKKKKKKK....',
     '................',
     '................']},

{k:'apple',cn:'苹果',en:'apple',names:['苹果','果','水果','apple','fruit'],
 pal:{K:'#3A1414',A:'#E8443C',B:'#B22B2B',H:'#FF9B8A',T:'#8A5A32',L:'#54B366'},
 px:['................',
     '.......KK.......',
     '.......TT.......',
     '...KKKKTTKLLK...',
     '..KAAAAAAAAKLK..',
     '.KAAHAAAAAAAABK.',
     'KAAHHAAAAAAAABBK',
     'KAAHHAAAAAAAABBK',
     'KAAAAAAAAAAAABBK',
     'KAAAAAAAAAAAABBK',
     'KAAAAAAAAAAABBBK',
     '.KAAAAAAAAAABBK.',
     '..KAAAAAAAABBK..',
     '...KKAAAABBKK...',
     '.....KKKKKK.....',
     '................']},

{k:'moon',cn:'月亮',en:'moon',names:['月亮','月','月球','晚安','夜','moon','night'],
 pal:{K:'#3A3208',A:'#FFE08A',B:'#D9B84D',C:'#FFF4C9'},
 px:['................',
     '.....KKKK.......',
     '...KKCAAKKK.....',
     '..KCAAAAABKK....',
     '.KCAAAAABKK.....',
     '.KCAAAABKK......',
     'KCAAABAK........',
     'KCAAAAAK........',
     'KCAAAAAK........',
     'KCAABAAK........',
     '.KCAAAABKK......',
     '.KCAAAAABKK.....',
     '..KCAAAAABKK....',
     '...KKCAABKKK....',
     '.....KKKK.......',
     '................']},

{k:'cloud',cn:'云',en:'cloud',names:['云','云朵','天气','阴','cloud','weather','sky'],
 pal:{K:'#2A2340',A:'#EDE9DC',B:'#B9B0C9',C:'#FFFFFF'},
 px:['................',
     '................',
     '................',
     '......KKKK......',
     '....KKCAAAKK....',
     '..KKCAAAAAAAKK..',
     '.KCAAAAAAAAAABK.',
     'KCAAAAAAAAAAABBK',
     'KCAAAAAAAAAAABBK',
     'KAAAAAAAAAAABBBK',
     '.KKKKKKKKKKKKKK.',
     '................',
     '................',
     '................',
     '................',
     '................']},

{k:'key',cn:'钥匙',en:'key',names:['钥匙','钥','解锁','密码','key','unlock','secret'],
 pal:{K:'#4A3208',A:'#FFC94D',B:'#D89A16',C:'#FFE9A8'},
 px:['................',
     '................',
     '................',
     '..KKKK..........',
     '.KCAAAK.........',
     'KCAKKAAK........',
     'KCAKKAAKKKKKKKK.',
     'KCAKKAAAAAAAAAK.',
     '.KAAAABKKAAKAAK.',
     '..KKKK..KBK.KBK.',
     '........KKK.KKK.',
     '................',
     '................',
     '................',
     '................',
     '................']},

{k:'gem',cn:'宝石',en:'gem',names:['宝石','钻石','钻','水晶','珠宝','gem','diamond','crystal'],
 pal:{K:'#0F2A38',A:'#3FD6C8',C:'#B7FFF3',B:'#1E8296'},
 px:['................',
     '................',
     '..KKKKKKKKKKKK..',
     '.KCCKAAAAAAKBBK.',
     'KCCCKAAAAAAKBBBK',
     '.KCCAAAAAAAABBK.',
     '..KCAAAAAAAABK..',
     '...KCAAAAAABK...',
     '....KCAAAABK....',
     '.....KCAABK.....',
     '......KCBK......',
     '.......KK.......',
     '................',
     '................',
     '................',
     '................']},

{k:'sun',cn:'太阳',en:'sun',names:['太阳','日','阳光','晴','热','sun','sunny','summer'],
 pal:{K:'#5C4008',Y:'#FFC94D',C:'#FFE9A8',B:'#E08A10'},
 px:['.......YY.......',
     '.......YY.......',
     '................',
     '.....KKKKKK.....',
     '...KKCCYYYBK....',
     '..KCCYYYYYYBK...',
     '..KCYYYYYYYBK...',
     'Y.KCYYYYYYYBK.Y.',
     'Y.KCYYYYYYYBK.Y.',
     '..KCYYYYYYYBK...',
     '..KCYYYYYYBBK...',
     '...KKYYYYBKK....',
     '.....KKKKKK.....',
     '................',
     '.......YY.......',
     '.......YY.......']},

{k:'fire',cn:'火',en:'fire',names:['火','火焰','燃','热','烧','fire','flame','hot','burn'],
 pal:{K:'#4A1408',R:'#FF5C2E',Y:'#FFC44D',W:'#FFF3C4'},
 px:['................',
     '................',
     '.......KK.......',
     '......KRRK......',
     '.....KRRRRK.....',
     '.....KRRRRK.....',
     '....KRRYYRRK....',
     '...KRRYYYYRRK...',
     '..KRRYYYYYYRRK..',
     '..KRRYYWWYYRRK..',
     '.KRRYYYWWYYYRRK.',
     '.KRRYYYWWYYYRRK.',
     '.KRRRYYYYYYRRRK.',
     '..KRRRRRRRRRRK..',
     '...KKKKKKKKKK...',
     '................']},

{k:'bolt',cn:'闪电',en:'lightning',names:['闪电','雷','电','快','速','lightning','bolt','flash','fast','power'],
 pal:{K:'#4A3208',Y:'#FFD24D',C:'#FFF0A8'},
 px:['................',
     '........KKK.....',
     '.......KCYK.....',
     '......KCYK......',
     '.....KCYK.......',
     '....KCYKKKK.....',
     '...KCYYYYYYK....',
     '...KKKCYYYK.....',
     '......KCYK......',
     '.....KCYK.......',
     '....KCYK........',
     '...KCYK.........',
     '..KCYK..........',
     '..KKK...........',
     '................',
     '................']},

{k:'robot',cn:'机器人',en:'robot',names:['机器人','机器','ai','人工智能','智能体','robot','bot','agent'],
 pal:{K:'#181428',A:'#B9C6D6',B:'#7A8AA0',E:'#74E0C0',C:'#E8EFF7'},
 px:['................',
     '.......KK.......',
     '.......KK.......',
     '..KKKKKKKKKKKK..',
     '..KCAAAAAAAABK..',
     '..KCEEAAAAEEBK..',
     '..KCEEAAAAEEBK..',
     '..KCAAAAAAAABK..',
     '..KCAKKKKKKABK..',
     '..KCAAAAAAAABK..',
     '..KKKKKKKKKKKK..',
     '...KCAAAAAABK...',
     '.KKKCAAAAAABKKK.',
     '.KAKCAAAAAABKAK.',
     '.KKKKAAAAAAKKKK.',
     '....KKKKKKKK....']},

{k:'btc',cn:'比特币',en:'bitcoin',names:['比特币','btc','币','加密','crypto','bitcoin','coin','钱'],
 pal:{K:'#4A2A08',A:'#F7931A',W:'#FFF3E0',B:'#C46E0A'},
 px:['................',
     '.....KKKKKK.....',
     '...KKAAAAAAKK...',
     '..KAAAAAAAAABK..',
     '.KAAAAWAWAAAABK.',
     '.KAAAWWWWWWABBK.',
     '.KAAAWWAAAWWABK.',
     '.KAAAWWWWWWABBK.',
     '.KAAAWWAAAWWABK.',
     '.KAAAWWWWWWABBK.',
     '.KAAAAWAWAAABBK.',
     '..KAAAAAAAABBK..',
     '...KKAAAABBKK...',
     '.....KKKKKK.....',
     '................',
     '................']},

{k:'flower',cn:'花',en:'flower',names:['花','花朵','鲜花','春','开花','flower','bloom','spring'],
 pal:{K:'#3A1430',P:'#FF7AB0',C:'#FFC0DC',Y:'#FFD24D',G:'#54B366'},
 px:['................',
     '.....KKKKKK.....',
     '...KKCCPPPPKK...',
     '..KCCPPPPPPPPK..',
     '..KCPPYYYYPPPK..',
     '..KCPPYYYYPPPK..',
     '..KPPPPPPPPPPK..',
     '...KKPPPPPPKK...',
     '......KGGK......',
     '...KKKKGGKKKK...',
     '..KGGGKGGKGGGK..',
     '...KKKKGGKKKK...',
     '......KGGK......',
     '......KGGK......',
     '......KKKK......',
     '................']},

{k:'cake',cn:'蛋糕',en:'cake',names:['蛋糕','生日','庆祝','甜','cake','birthday','party'],
 pal:{K:'#3A2418',Y:'#FFD24D',C:'#FF7A9C',W:'#FFF3E0',A:'#E8B87A',B:'#C98F52',P:'#FF9BB0'},
 px:['................',
     '....Y..YY..Y....',
     '....C..CC..C....',
     '....C..CC..C....',
     '....C..CC..C....',
     '.KKKKKKKKKKKKKK.',
     '.KWWWWWWWWWWWWK.',
     '.KWPWWPPWWPWWWK.',
     '.KKKKKKKKKKKKKK.',
     '.KAAAAAAAAAAAAK.',
     '.KAPPPPPPPPPPAK.',
     '.KAAAAAAAAAAABK.',
     '.KAAAAAAAAAABBK.',
     '.KKKKKKKKKKKKKK.',
     '................',
     '................']},

{k:'music',cn:'音乐',en:'music',names:['音乐','音符','歌','唱','listen','music','note','song','audio'],
 pal:{K:'#241C34',A:'#B78BFF',C:'#E0CCFF',B:'#7A55C4'},
 px:['................',
     '.......KKKKKK...',
     '.......KCAAABK..',
     '.......KCAAABK..',
     '.......KCAKKKK..',
     '.......KCAK.....',
     '.......KCAK.....',
     '.......KCAK.....',
     '....KKKKCAK.....',
     '..KKCAAKCAK.....',
     '.KCAAAAKCAK.....',
     '.KCAAAABKKK.....',
     '.KCAAAABK.......',
     '..KCAABK........',
     '...KKKK.........',
     '................']},

{k:'sword',cn:'剑',en:'sword',names:['剑','刀','武器','战','打','sword','blade','weapon','fight'],
 pal:{K:'#1A1826',W:'#DCE3EC',B:'#8E9AAE',G:'#FFC94D',H:'#8A5A32',P:'#D89A16'},
 px:['.......KK.......',
     '......KWBK......',
     '......KWBK......',
     '......KWBK......',
     '......KWBK......',
     '......KWBK......',
     '......KWBK......',
     '......KWBK......',
     '......KWBK......',
     '...KKKKWBKKKK...',
     '...KGGKWBKGGK...',
     '....KKKHHKKK....',
     '......KHHK......',
     '......KHHK......',
     '......KPPK......',
     '......KKKK......']}
,
{k:'clock',cn:'闹钟',en:'clock',names:['闹钟','时钟','钟','时间','早八','起床','早起','迟到','准时','deadline','截止','倒时','alarm','clock','time'],
 pal:{K:'#2B1B2E',A:'#E0574F',W:'#F7F3E8',B:'#B33F3A'},
 px:['................',
     '................',
     '..KK........KK..',
     '.KAAK......KAAK.',
     '.KAAAKKKKKKAAAK.',
     '..KAAAAAAAAAAK..',
     '..KAWWWWWWWWAK..',
     '..KAWWWKWWWWBK..',
     '..KAWWWKWWWWBK..',
     '..KAWWWKKKKWBK..',
     '..KAWWWWWWWWBK..',
     '..KAAAAAAAABBK..',
     '...KKAAAABBKK...',
     '.....KKKKKK.....',
     '...KK......KK...',
     '..KK........KK..']},

{k:'redpacket',cn:'红包',en:'red packet',names:['红包','年终奖','奖金','发财','过年','工资','薪水','分红','压岁钱','bonus','钱'],
 pal:{K:'#3A0F14',R:'#E03B45',Y:'#FFC94D',B:'#A8232C'},
 px:['................',
     '..KKKKKKKKKKKK..',
     '..KRRRRRRRRRBK..',
     '..KRRRRRRRRRBK..',
     '..KRKKKKKKKKBK..',
     '..KRRRRRRRRRBK..',
     '..KRRRRRRRRRBK..',
     '..KRRRKYYKRRBK..',
     '..KRRKYYYYKRBK..',
     '..KRRKYYYYKRBK..',
     '..KRRRKYYKRRBK..',
     '..KRRRRRRRRRBK..',
     '..KRRRRRRRRRBK..',
     '..KRRRRRRRRRBK..',
     '..KKKKKKKKKKKK..',
     '................']},

{k:'envelope',cn:'信封',en:'envelope',names:['信','信封','邮件','offer','消息','通知','来信','录用','email','mail','letter','inbox'],
 pal:{K:'#2A2340',W:'#EDE9DC',B:'#B9B0C9'},
 px:['................',
     '................',
     '................',
     '................',
     '.KKKKKKKKKKKKKK.',
     '.KWKWWWWWWWWKBK.',
     '.KWWKWWWWWWKWBK.',
     '.KWWWKWWWWKWWBK.',
     '.KWWWWKWWKWWWBK.',
     '.KWWWWWKKWWWWBK.',
     '.KWWWWWWWWWWWBK.',
     '.KWWWWWWWWWWWBK.',
     '.KKKKKKKKKKKKKK.',
     '................',
     '................',
     '................']},

{k:'laptop',cn:'电脑',en:'laptop',names:['电脑','笔记本','加班','上班','工作','打工','代码','编程','程序员','远程','办公','搬砖','写代码','coding','work','laptop','wfh','996'],
 pal:{K:'#181428',A:'#A6B0C4',G:'#2F6E8F',C:'#7ED0E8',B:'#6C7688'},
 px:['................',
     '................',
     '..KKKKKKKKKKKK..',
     '..KCCCGGGGGGGK..',
     '..KCCCCCGGGGGK..',
     '..KCCGGGGGGGGK..',
     '..KCGGGGGGGGGK..',
     '..KGGGGGGGGGGK..',
     '..KGGGGGGGGGGK..',
     '..KKKKKKKKKKKK..',
     '.KAAAAAAAAAAAAK.',
     '.KAAAAKKKKAAAAK.',
     'KKKKKKKKKKKKKKKK',
     '................',
     '................',
     '................']},

{k:'raincloud',cn:'雨云',en:'rain cloud',names:['雨','下雨','焦虑','难过','emo','抑郁','阴天','坏消息','低落','忧郁','烦','阴','淋雨','rain','sad'],
 pal:{K:'#242040',A:'#8E93B8',B:'#5F6488',R:'#5AC8E0'},
 px:['................',
     '................',
     '......KKKK......',
     '....KKAAAAKK....',
     '..KKAAAAAAAAKK..',
     '.KAAAAAAAAAAABK.',
     'KAAAAAAAAAAAABBK',
     'KAAAAAAAAAAABBBK',
     '.KKKKKKKKKKKKKK.',
     '................',
     '...R...RR...R...',
     '...R...RR...R...',
     '................',
     '.....R....R.....',
     '.....R....R.....',
     '................']},

{k:'gear',cn:'齿轮',en:'gear',names:['齿轮','算法','系统','机制','工程','自动','引擎','运转','结构','架构','流程','设置','gear','system'],
 pal:{K:'#1A1826',A:'#9AA6BA',C:'#DCE3EC',B:'#6A7488'},
 px:['......KKKK......',
     '......KCAK......',
     '..KKKKKCAKKKKK..',
     '..KCCAAAAAAABK..',
     '..KCCAAAAAAABK..',
     '..KCCKKKKKKBBK..',
     'KKKCCK....KBBKKK',
     'KCCCCK....KBBBBK',
     'KCCCCK....KBBBBK',
     'KKKCCK....KBBKKK',
     '..KCCKKKKKKBBK..',
     '..KCCAAAAAABBK..',
     '..KCCAAAAAABBK..',
     '..KKKKKABKKKKK..',
     '......KABK......',
     '......KKKK......']},

{k:'bulb',cn:'灯泡',en:'idea',names:['灯泡','想法','灵感','点子','创意','顿悟','明白','开窍','思路','主意','idea','insight'],
 pal:{K:'#3A3208',Y:'#FFD24D',C:'#FFF0A8',A:'#B9B0C9',B:'#E0A310'},
 px:['................',
     '......KKKK......',
     '....KKCCYYKK....',
     '...KCCYYYYYYK...',
     '..KCYYYYYYYYBK..',
     '..KCYYYBBYYYBK..',
     '..KCYYYBBYYYBK..',
     '..KCYYYYYYYYBK..',
     '...KYYYYYYYBK...',
     '....KKYYYYKK....',
     '......KKKK......',
     '......KAAK......',
     '......KAAK......',
     '......KBBK......',
     '......KKKK......',
     '................']},

{k:'bird',cn:'鸟',en:'bird',names:['鸟','自由','飞','飞翔','离开','迁徙','翅膀','放飞','小鸟','freedom','fly','bird'],
 pal:{K:'#1A2438',A:'#5AC8E0',C:'#B7ECF7',B:'#2E8CA8',E:'#1A2438',Y:'#FFC94D'},
 px:['................',
     '................',
     '................',
     '.......KKKK.....',
     '......KCAAAK....',
     '.....KCAEAAAK...',
     '..KYYKCAAAAAK...',
     '....KCAAAAAAAK..',
     '....KCAAABBBAK..',
     '....KCAAABBBBK..',
     '....KCAAABBBAK..',
     '.....KCAAAAAK...',
     '......KKKKKK....',
     '.......K..K.....',
     '......KK..KK....',
     '................']},

{k:'chart',cn:'图表',en:'chart',names:['图表','行情','涨','跌','市场','数据','预测','走势','k线','增长','曲线','报表','指标','统计','chart','data','market'],
 pal:{K:'#1C2A24',A:'#4FC38A',C:'#9BF0C4',B:'#2E7A55'},
 px:['................',
     '................',
     '................',
     'K............CCC',
     'K............CCC',
     'K........AAA.CCC',
     'K........AAA.CCC',
     'K....AAA.AAA.CCC',
     'K....AAA.AAA.CCC',
     'KBBB.AAA.AAA.CCC',
     'KBBB.AAA.AAA.CCC',
     'KBBB.AAA.AAA.CCC',
     'KBBB.AAA.AAA.CCC',
     'KKKKKKKKKKKKKKKK',
     '................',
     '................']},

{k:'dice',cn:'骰子',en:'dice',names:['骰子','运气','随机','概率','赌','博弈','押注','赌注','机会','碰运气','luck','bet','random','dice'],
 pal:{K:'#241C34',W:'#EDE9DC',D:'#E0574F',B:'#B9B0C9'},
 px:['................',
     '................',
     '..KKKKKKKKKKKK..',
     '..KWWWWWWWWWBK..',
     '..KWDDWWWWDDBK..',
     '..KWDDWWWWDDBK..',
     '..KWWWWWWWWWBK..',
     '..KWWWWDDWWWBK..',
     '..KWWWWDDWWWBK..',
     '..KWWWWWWWWWBK..',
     '..KWDDWWWWDDBK..',
     '..KWDDWWWWDDBK..',
     '..KWWWWWWWWWBK..',
     '..KKKKKKKKKKKK..',
     '................',
     '................']},

{k:'pill',cn:'药丸',en:'pill',names:['药','药丸','多巴胺','上头','成瘾','治愈','胶囊','解药','嗑','爽','pill','dopamine'],
 pal:{K:'#2A1B3A',A:'#FF7A9C',C:'#FFC0D4',B:'#5AC8E0',D:'#2E8CA8'},
 px:['................',
     '................',
     '................',
     '................',
     '....KKKKKKKK....',
     '..KKCCAAABBBKK..',
     '.KCCAAAAABBBBBK.',
     '.KCAAAAAABBBBDK.',
     '.KAAAAAAABBBBDK.',
     '..KKAAAABBBDDK..',
     '....KKKKKKKK....',
     '................',
     '................',
     '................',
     '................',
     '................']},

{k:'battery',cn:'电池',en:'battery',names:['电池','能量','精力','充电','没电','续航','疲惫','累','耗尽','电量','battery','energy'],
 pal:{K:'#1A2620',W:'#DCD6C8',G:'#4FC38A',B:'#8E9488'},
 px:['................',
     '......KKKK......',
     '...KKKKKKKKKK...',
     '...KWWWWWWWWK...',
     '...KWWWWWWWWK...',
     '...KWWWWWWWWK...',
     '...KWWWWWWWWK...',
     '...KKKKKKKKKK...',
     '...KGGGGGGGGK...',
     '...KGGGGGGGGK...',
     '...KGGGGGGGGK...',
     '...KGGGGGGGGK...',
     '...KGGGGGGGGK...',
     '...KKKKKKKKKK...',
     '................',
     '................']},

{k:'book',cn:'书',en:'book',names:['书','读书','学习','知识','考试','论文','阅读','课本','文献','看书','study','book','read'],
 pal:{K:'#2A1B12',W:'#EDE9DC',B:'#B9B0C9',R:'#C25A3A'},
 px:['................',
     '................',
     '................',
     '.KKKKKK..KKKKKK.',
     'KWWWWWWKKWWWWWWK',
     'KWBBBBWKKWBBBBWK',
     'KWWWWWWKKWWWWWWK',
     'KWBBBBWKKWBBBBWK',
     'KWWWWWWKKWWWWWWK',
     'KWBBBBWKKWBBBBWK',
     'KWWWWWWKKWWWWWWK',
     'KWWWWWWKKWWWWWWK',
     'KRRRRRRKKRRRRRRK',
     'KKKKKKKKKKKKKKKK',
     '................',
     '................']},

{k:'phone',cn:'手机',en:'phone',names:['手机','刷手机','社交','短信','聊天','在线','刷','低头','app','phone','chat'],
 pal:{K:'#181428',A:'#6C7688',G:'#2F6E8F',C:'#7ED0E8'},
 px:['................',
     '....KKKKKKKK....',
     '....KAAAAAAK....',
     '....KCCGGGGK....',
     '....KCGGGGGK....',
     '....KGGGGGGK....',
     '....KGGGGGGK....',
     '....KGGGGGGK....',
     '....KGGGGGGK....',
     '....KGGGGGGK....',
     '....KGGGGGGK....',
     '....KGGGGGGK....',
     '....KAAAAAAK....',
     '....KAAKKAAK....',
     '....KKKKKKKK....',
     '................']},

{k:'mountain',cn:'山',en:'mountain',names:['山','目标','挑战','困难','登顶','远方','高峰','爬山','攀登','旅行','险峰','mountain','goal'],
 pal:{K:'#1E2A34',A:'#5E7A8C',W:'#EDE9DC',B:'#3A5262'},
 px:['................',
     '................',
     '................',
     '................',
     '.......KK.......',
     '......KWWK......',
     '.....KWWWWK.....',
     '....KAWWWWBK....',
     '...KAAAWWBBBK...',
     '..KAAAAAABBBBK..',
     '.KAAAAAAABBBBBK.',
     'KAAAAAAAABBBBBBK',
     'KAAAAAAAABBBBBBK',
     'KKKKKKKKKKKKKKKK',
     '................',
     '................']},

{k:'door',cn:'门',en:'door',names:['门','机会','出口','入口','选择','离职','跳槽','转折','面试','新的开始','大门','door','exit'],
 pal:{K:'#2A1B12',A:'#A5763F',B:'#6E4A22',Y:'#FFC94D'},
 px:['................',
     '..KKKKKKKKKKKK..',
     '..KAAAAAAAAAAK..',
     '..KABBBBBBBBAK..',
     '..KABBBBBBBBAK..',
     '..KABBBBBBBBAK..',
     '..KAAAAAAAAAAK..',
     '..KAAAAAAAYAAK..',
     '..KAAAAAAAAAAK..',
     '..KABBBBBBBBAK..',
     '..KABBBBBBBBAK..',
     '..KABBBBBBBBAK..',
     '..KAAAAAAAAAAK..',
     '..KKKKKKKKKKKK..',
     '................',
     '................']},

{k:'eye',cn:'眼睛',en:'eye',names:['眼','眼睛','看','观察','关注','注意','监控','视角','洞察','盯','看见','eye','watch'],
 pal:{K:'#241C34',W:'#EDE9DC',E:'#3FA0D6',C:'#FFFFFF',B:'#B9B0C9'},
 px:['................',
     '................',
     '................',
     '................',
     '....KKKKKKKK....',
     '..KKWWWWWWWWKK..',
     '.KWWWEEEEEEWWWK.',
     'KWWWEEEEEEEEWWWK',
     'KWWWEECKKKEEWWBK',
     'KWWWEEKKKKEEWWBK',
     'KWWWEEEEEEEEWWBK',
     '.KWWWEEEEEEWWBK.',
     '..KKWWWWWWWWBK..',
     '....KKKKKKKK....',
     '................',
     '................']},

{k:'hourglass',cn:'沙漏',en:'hourglass',names:['沙漏','等待','耐心','倒计时','剩余','流逝','时限','拖延','来不及','沙','hourglass','wait'],
 pal:{K:'#2A1B12',A:'#E8B87A',W:'#DCEBF0',B:'#B08040'},
 px:['................',
     '................',
     '.KKKKKKKKKKKKKK.',
     '.KAAAAAAAAAAAAK.',
     '..KAAAAAAAAAAK..',
     '...KAAAAAAAAK...',
     '....KAAAAAAK....',
     '.....KAAAAK.....',
     '......KAAK......',
     '.....KWWWWK.....',
     '....KWWWWWWK....',
     '...KWWWWWWWWK...',
     '..KWWWAAAAWWWK..',
     '.KWWAAAAAAAAWWK.',
     '.KKKKKKKKKKKKKK.',
     '................']},

{k:'sprout',cn:'芽',en:'sprout',names:['芽','成长','开始','新','希望','发芽','萌芽','起步','种子','新手','入门','growth','start','sprout'],
 pal:{K:'#123018',G:'#54B366',C:'#8FE39B',B:'#2E7A45'},
 px:['................',
     '................',
     '................',
     '................',
     '................',
     '...KKK....KKK...',
     '..KCCGK..KGBBK..',
     '..KCGGGKKGGBBK..',
     '...KGGGKKGGBK...',
     '....KKKGGKKK....',
     '......KGGK......',
     '......KGBK......',
     '......KGBK......',
     '......KGBK......',
     '......KKKK......',
     '................']}

];

/* ---------- 工具 ---------- */
const $ = s => document.querySelector(s);
function fnv1a(s){let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h>>>0;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function hsl2hex(h,s,l){
  h=((h%360)+360)%360;s/=100;l/=100;
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  let r,g,b;
  if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];
  else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else[r,g,b]=[c,0,x];
  const t=v=>Math.round((v+m)*255).toString(16).padStart(2,'0');
  return '#'+t(r)+t(g)+t(b);
}
function lum(hex){const n=parseInt(hex.slice(1),16);return .2126*((n>>16)&255)+.7152*((n>>8)&255)+.0722*(n&255);}
const norm = s => (s||'').trim().toLowerCase().replace(/[\s_\-·,，。.!！?？~、]/g,'');


/* 语义别名：让抽象词也能落到对得上的图上 */
const EXTRA={
 cat:['喵星人','撸猫','猫奴'],
 heart:['心动','爱情','喜爱','恋','告白','在乎'],
 star:['许愿','闪耀','星光','明日之星'],
 tree:['树林','森林','绿','环保','木','大自然'],
 house:['房产','租房','搬家','买房','安家','归属'],
 rocket:['创业','爆发','起飞了','冲','发射台','冲刺'],
 ghost:['鬼故事','万圣节','消失','幽灵般','halloween','人间蒸发'],
 mushroom:['菌菇','蘑菇头','森林里'],
 coffee:['咖啡因','续命','提神','美式','手冲','奶茶','饮料','下午茶'],
 crown:['冠','称王','夺冠','老板','领导','第一名','top'],
 fish:['咸鱼','钓','水族','海鲜','游'],
 skull:['致命','恐怖','完蛋','翻车','海盗','危','有毒'],
 apple:['果实','收获','红苹果','水果'],
 moon:['深夜','半夜','熬夜','失眠','月光','晚','孤独','安静','夜里'],
 cloud:['云计算','多云','天空','飘','白云'],
 key:['关键','密钥','钥','解法','答案','破解','入场券'],
 gem:['珍贵','稀有','价值','珠宝','闪闪','宝藏'],
 sun:['白天','早晨','晴天','温暖','光','好天气','阳光明媚'],
 fire:['火爆','热度','燃烧','爆火','激情','卷','上头了','热'],
 bolt:['速度','瞬间','触电','爆发力','一击','极速'],
 robot:['自动化','agent','智能','llm','大模型','gpt','ai助手','机器'],
 btc:['区块链','web3','defi','挖矿','代币','token','加密货币','财富'],
 flower:['浪漫','花园','绽放','美','春天','送花'],
 cake:['甜点','庆祝','生日快乐','甜','蛋糕店','纪念日'],
 music:['旋律','听歌','耳机','节奏','播放','唱歌','演唱会'],
 sword:['战斗','对决','锋利','武','决斗','pk','出鞘','较量']
};
LIB.forEach(sp=>{ if(EXTRA[sp.k]) sp.names=sp.names.concat(EXTRA[sp.k]); });

/* ---------- 词库查找 ---------- */
const INDEX=[];
LIB.forEach(sp=>sp.names.forEach(n=>INDEX.push({a:norm(n),sp})));
INDEX.sort((x,y)=>y.a.length-x.a.length);
const ASCII=/^[a-z0-9]+$/;
// 三档命中，逐档放宽，并把"凭什么这么画"如实告诉用户
function resolve(word){
  const w=norm(word); if(!w)return null;
  for(const e of INDEX) if(e.a===w) return {sp:e.sp,via:'exact'};             // 一档：全等
  // 长的优先；一样长取靠后的——中文复合词的中心语在后，深夜加班的重点是「加班」
  const pick=c=>c.length?c.sort((x,y)=>y.a.length-x.a.length||y.i-x.i)[0]:null;
  const multi=[],mono=[];
  for(const e of INDEX){
    if(ASCII.test(e.a)){
      if(e.a.length<3)continue;
      const m=w.match(new RegExp('(^|[^a-z0-9])'+e.a+'($|[^a-z0-9])'));
      if(m)multi.push({a:e.a,sp:e.sp,i:m.index});
    }else{
      const i=w.lastIndexOf(e.a);
      if(i>=0)(e.a.length>=2?multi:mono).push({a:e.a,sp:e.sp,i});
    }
  }
  const m2=pick(multi); if(m2)return {sp:m2.sp,via:'part',hit:m2.a};          // 二档：整词
  const m1=pick(mono);  if(m1)return {sp:m1.sp,via:'morph',hit:m1.a};         // 三档：单字词素
  return null;
}
const lookup=w=>{const r=resolve(w);return r?r.sp:null;};

/* ---------- 空网格 / 绘制原语 ---------- */
const blank = () => Array.from({length:N},()=>Array(N).fill('.'));
function setpx(g,x,y,c){ if(x>=0&&x<N&&y>=0&&y<N) g[y][x]=c; }
function ellipse(g,cx,cy,rx,ry,c){
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const dx=(x+.5-cx)/rx, dy=(y+.5-cy)/ry;
    if(dx*dx+dy*dy<=1) g[y][x]=c;
  }
}
function outline(g,c){
  const o=g.map(r=>r.slice());
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(g[y][x]!=='.')continue;
    let touch=false;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;
      if(nx>=0&&nx<N&&ny>=0&&ny<N&&g[ny][nx]!=='.'&&g[ny][nx]!==c)touch=true;
    }
    if(touch)o[y][x]=c;
  }
  return o;
}
// 按光源方向塑形（左上来光）：迎光细亮边 + 背光较厚暗部
// 沿轮廓一圈上亮下暗是"枕头阴影"，形体会像抱枕，不能那么做
function shadeDir(g,base,light,dark,lx,ly){
  const solid=(y,x)=>y>=0&&y<N&&x>=0&&x<N&&g[y][x]!=='.'&&g[y][x]!=='K';
  const o=g.map(r=>r.slice()), deep=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(g[y][x]!==base)continue;
    let nx=0,ny=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy)continue;
      if(!solid(y+dy,x+dx)){nx+=dx;ny+=dy;}
    }
    if(!nx&&!ny)continue;                    // 内部，不动
    const d=nx*lx+ny*ly;                     // 法线与光向的夹角
    if(d>1.5)o[y][x]=light;
    else if(d<-1.5){o[y][x]=dark;deep.push([y,x]);}
  }
  deep.forEach(([y,x])=>{                    // 背光侧向内加厚一格
    const yy=y+ly,xx=x+lx;
    if(o[yy]&&o[yy][xx]===base)o[yy][xx]=dark;
  });
  [light,dark].forEach(c=>{                  // 去孤立像素，否则边缘会碎成噪点
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      if(o[y][x]!==c)continue;
      let n=0;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])
        if(o[y+dy]&&o[y+dy][x+dx]===c)n++;
      if(!n)o[y][x]=base;
    }
  });
  return o;
}
function despeckle(g){
  const o=g.map(r=>r.slice());
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    if(g[y][x]==='.')continue;
    let n=0;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;
      if(nx>=0&&nx<N&&ny>=0&&ny<N&&g[ny][nx]!=='.')n++;
    }
    if(n<=1)o[y][x]='.';
  }
  return o;
}

/* ---------- 程序生成 ---------- */
function forge(word,variant){
  const seed=(fnv1a(word)+variant*0x9E3779B9)>>>0;
  const R=mulberry32(seed);
  const h0=Math.floor(R()*360);
  const scheme=[150,180,40,-100][Math.floor(R()*4)];
  // 阴影不是"同色变暗"：暗部色相朝紫蓝走、亮部朝暖黄走，走最短角度路径
  const toward=(h,t,k)=>h+((((t-h)%360)+540)%360-180)*k;
  const pal={
    '.':null,
    K:hsl2hex(toward(h0,268,.34),46,13),
    A:hsl2hex(h0,58,55),
    B:hsl2hex(toward(h0,268,.30),60,36),
    C:hsl2hex(toward(h0,50,.30),62,76),
    D:hsl2hex(h0+scheme,72,60),
    W:hsl2hex(toward(h0,50,.20),52,93),
    G:hsl2hex(108+R()*34,42,34),
    H:hsl2hex(108+R()*34,46,50)
  };
  const roll=R();
  const kind = roll<.36?'creature' : roll<.60?'relic' : roll<.80?'bloom' : 'crystal';
  let g=blank();

  if(kind==='creature'){
    const bw=3.0+R()*1.6, bh=2.7+R()*1.4, cy=10.0+R()*1.0;
    ellipse(g,8,cy,bw,bh,'A');
    const hr=2.2+R()*1.2, hy=Math.max(hr+1.4,cy-bh-hr*.45);
    ellipse(g,8,hy,hr,hr*.94,'A');
    // 耳 / 角 / 触须，成对生长
    const ears=Math.floor(R()*3);
    for(let i=0;i<ears;i++){
      const off=1.1+R()*(hr*.9), ey=Math.max(1.2,hy-hr*(.55+R()*.5)), r=.8+R()*.8;
      ellipse(g,8-off,ey,r,r*(1.1+R()*.9),'A'); ellipse(g,8+off,ey,r,r*(1.1+R()*.9),'A');
    }
    // 脚
    if(R()<.65){ const off=1.3+R()*2;
      ellipse(g,8-off,cy+bh-.3,1.05,1.2,'A'); ellipse(g,8+off,cy+bh-.3,1.05,1.2,'A'); }
    // 手臂
    if(R()<.45){ const ay=cy-.5, off=bw+.6;
      ellipse(g,8-off,ay,1.1,1.5,'A'); ellipse(g,8+off,ay,1.1,1.5,'A'); }
    g=despeckle(g); g=outline(g,'K'); g=shadeDir(g,'A','C','B',-1,-1);
    // 肚皮
    if(R()<.55){
      const t=blank(); ellipse(t,8,cy+.5,bw*.6,bh*.58,'Z');
      for(let y=0;y<N;y++)for(let x=0;x<N;x++)
        if(t[y][x]==='Z'&&(g[y][x]==='A'||g[y][x]==='B'))g[y][x]='C';
    }
    // 眼睛：以头心为准，落不上就往内收一格
    let ey=-1,lx=-1,rx=-1,best=0;
    const inner=(y,x)=>g[y]&&g[y][x]&&g[y][x]!=='.'&&g[y][x]!=='K';
    const wide=y=>{let n=0;for(let x=0;x<N;x++)if(inner(y,x))n++;return n;};
    for(let y=2;y<=8;y++){ const w=wide(y); if(w>=5&&w>=best){best=w;ey=y;} }
    if(ey>0) for(let k=Math.max(1,Math.round(hr*.62));k>=1;k--){
      const a=8-k-1,b=8+k;
      if(inner(ey,a)&&inner(ey,b)&&inner(ey,a+1)&&inner(ey,b-1)){lx=a;rx=b;break;}
    }
    if(lx>=0){
      const big=hr>=2.7&&rx-lx>=5;
      const cols=big?[lx,lx+1,rx-1,rx]:[lx,rx];
      cols.forEach(x=>{ setpx(g,x,ey,'K'); if(g[ey+1]&&g[ey+1][x]!=='.')setpx(g,x,ey+1,'K'); });
      if(big){ setpx(g,lx,ey,'W'); setpx(g,rx,ey,'W'); }
      if(R()<.45&&g[ey+2])[7,8].forEach(x=>{ if(g[ey+2][x]!=='.'&&g[ey+2][x]!=='K')setpx(g,x,ey+2,'K'); });
    }
    // 记号
    if(R()<.45){
      const sy=Math.round(cy-bh*.35), sx=Math.max(1,Math.round(8-bw*.72));
      if(g[sy]&&g[sy][sx]&&g[sy][sx]!=='.'&&g[sy][sx]!=='K'){g[sy][sx]='D';g[sy][15-sx]='D';}
    }
  }

  else if(kind==='bloom'){
    for(let y=8;y<14;y++){ g[y][7]='G'; g[y][8]='G'; }
    ellipse(g,4.5,11.5,2.0,1.2,'G'); ellipse(g,11.5,11.5,2.0,1.2,'G');
    const n=[5,6,8][Math.floor(R()*3)], rad=3.6+R()*.8, pr=1.5+R()*.7;
    for(let i=0;i<n;i++){
      const a=(i/n)*Math.PI*2-Math.PI/2;
      ellipse(g,8+Math.cos(a)*rad,6+Math.sin(a)*rad*.9,pr,pr,'A');
    }
    ellipse(g,8,6,1.9,1.8,'D');
    g=outline(g,'K');
    g=shadeDir(g,'A','C','B',-1,-1);
    g=shadeDir(g,'G','H','G',-1,-1);
    setpx(g,7,5,'W');
  }

  else if(kind==='relic'){
    const inset=2+Math.floor(R()*2), cut=1+Math.floor(R()*2);
    const x0=inset+1, x1=14-inset, y0=inset, y1=15-inset;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=Math.min(x-x0,x1-x), dy=Math.min(y-y0,y1-y);
      if(dx+dy<cut)continue;
      g[y][x]=(dx===0||dy===0)?'B':'A';
    }
    if(R()<.5) for(let y=Math.max(0,y0-2);y<y0;y++){ g[y][7]='B'; g[y][8]='B'; }
    const dens=.26+R()*.3;
    for(let y=y0+2;y<=y1-2;y++)for(let x=x0+2;x<=7;x++)
      if(R()<dens){ g[y][x]='D'; g[y][15-x]='D'; }
    ellipse(g,8,8,1.3+R()*.8,1.3+R()*.8,'C');
    g=outline(g,'K');
    setpx(g,7,7,'W');
  }

  else { // crystal
    const flat=R()<.45;
    const top=1+Math.floor(R()*2), mid=5+Math.floor(R()*3), bot=13+Math.floor(R()*3);
    const maxW=5+Math.floor(R()*2);
    for(let y=top;y<bot;y++){
      let t = y<mid ? (y-top)/Math.max(1,mid-top) : 1-(y-mid)/Math.max(1,bot-mid);
      if(flat&&y<mid) t=Math.max(t,.5);
      const w=Math.max(1,Math.round(t*maxW));
      for(let x=8-w;x<8+w;x++) g[y][x]='A';
    }
    for(let y=top;y<bot;y++)for(let x=0;x<N;x++){
      if(g[y][x]!=='A')continue;
      if(x<7&&(x===0||g[y][x-1]==='.'))g[y][x]='C';
      if(x>8&&(x===15||g[y][x+1]==='.'))g[y][x]='B';
    }
    if(g[mid]&&R()<.6){                       // 腰线收进内侧，别横切到轮廓
      const row=[]; for(let x=0;x<N;x++) if(g[mid][x]!=='.')row.push(x);
      row.slice(1,-1).forEach(x=>g[mid][x]='D');
    }
    if(R()<.6) for(let y=mid+1;y<bot-1;y++) if(g[y][7]!=='.'){ g[y][7]='C'; g[y][8]='C'; }
    g=outline(g,'K');
    setpx(g,6,top+2,'W');
  }

  return {grid:g,pal,seed,kind};
}

/* ---------- 图样 → 绘制指令 ---------- */
function analyse(grid,pal){
  const used={},cells=[];
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const ch=grid[y][x]; if(ch==='.'||!pal[ch])continue;
    used[ch]=(used[ch]||0)+1; cells.push({x,y,ch});
  }
  const keys=Object.keys(used);
  if(!keys.length)return{cells:[],order:[],colors:[]};
  const K=keys.reduce((a,b)=>lum(pal[a])<lum(pal[b])?a:b);
  const rest=keys.filter(k=>k!==K);
  const base=rest.length?rest.reduce((a,b)=>used[a]>=used[b]?a:b):K;
  const layer=c=>c.ch===base?0:(c.ch===K?1:2);
  const order=cells.slice().sort((a,b)=>layer(a)-layer(b)||a.y-b.y||a.x-b.x);
  const colors=keys.sort((a,b)=>lum(pal[a])-lum(pal[b])).map(k=>pal[k]);
  return {cells,order,colors,layerOf:layer};
}


/* 自检: 图样必须严格 16×16 且用色都有定义 */
(function validate(){
  const bad=[];
  LIB.forEach(sp=>{
    if(sp.px.length!==N)bad.push(`${sp.k}: ${sp.px.length} 行`);
    sp.px.forEach((r,i)=>{
      if(r.length!==N)bad.push(`${sp.k} r${i}: ${r.length} 列`);
      [...r].forEach(ch=>{ if(ch!=='.'&&!sp.pal[ch])bad.push(`${sp.k} r${i}: 未定义色 '${ch}'`); });
    });
  });
  if(bad.length)console.error('[PIXELDEX] 图样错误\n'+bad.join('\n'));
  else console.log('[PIXELDEX] 图样自检通过 ×'+LIB.length);
  window.__pixeldexErrors=bad;
})();
