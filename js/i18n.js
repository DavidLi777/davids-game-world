// Languages: the site's menus, buttons and headings in 14 languages (Arabic and Hebrew read right to left).
// On the public site, longer texts such as game rules and posts can also be translated on request by the server.
const LANGS = [['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'], ['it', 'Italiano'], ['ru', 'Русский'], ['tr', 'Türkçe'], ['ar', 'العربية'], ['he', 'עברית'], ['hi', 'हिन्दी'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어']];
const RTL = new Set(['ar', 'he']);
// English | es | fr | de | pt | it | ru | tr | ar | he | hi | zh | ja | ko
const I18N_SRC = `Games|Juegos|Jeux|Spiele|Jogos|Giochi|Игры|Oyunlar|الألعاب|משחקים|गेम्स|游戏|ゲーム|게임
Feed|Noticias|Fil|Feed|Feed|Feed|Лента|Akış|الموجز|פיד|फ़ीड|动态|フィード|피드
Explore|Explorar|Explorer|Entdecken|Explorar|Esplora|Обзор|Keşfet|استكشاف|גילוי|एक्सप्लोर|探索|探す|탐색
Watch|Ver|Regarder|Ansehen|Assistir|Guarda|Смотреть|İzle|مشاهدة|צפייה|देखें|观看|見る|보기
Communities|Comunidades|Communautés|Communitys|Comunidades|Community|Сообщества|Topluluklar|المجتمعات|קהילות|समुदाय|社区|コミュニティ|커뮤니티
Messages|Mensajes|Messages|Nachrichten|Mensagens|Messaggi|Сообщения|Mesajlar|الرسائل|הודעות|संदेश|消息|メッセージ|메시지
Friends|Amigos|Amis|Freunde|Amigos|Amici|Друзья|Arkadaşlar|الأصدقاء|חברים|दोस्त|好友|友達|친구
Match|Citas|Rencontres|Match|Match|Match|Знакомства|Eşleş|التعارف|היכרויות|मैच|匹配|マッチ|매치
Questions|Preguntas|Questions|Fragen|Perguntas|Domande|Вопросы|Sorular|الأسئلة|שאלות|प्रश्न|问答|質問|질문
Neighbourhood|Vecindario|Quartier|Nachbarschaft|Vizinhança|Quartiere|Район|Mahalle|الحي|השכונה|पड़ोस|街坊|近所|동네
Events|Eventos|Événements|Veranstaltungen|Eventos|Eventi|События|Etkinlikler|الفعاليات|אירועים|कार्यक्रम|活动|イベント|이벤트
Leaderboards|Clasificaciones|Classements|Bestenlisten|Classificações|Classifiche|Рейтинги|Sıralamalar|لوحات الصدارة|טבלאות מובילים|लीडरबोर्ड|排行榜|ランキング|순위표
Tournaments|Torneos|Tournois|Turniere|Torneios|Tornei|Турниры|Turnuvalar|البطولات|טורנירים|टूर्नामेंट|锦标赛|トーナメント|토너먼트
Leagues|Ligas|Ligues|Ligen|Ligas|Leghe|Лиги|Ligler|الدوريات|ליגות|लीग|联赛|リーグ|리그
Lobby|Sala|Salon|Lobby|Saguão|Sala|Лобби|Lobi|الردهة|לובי|लॉबी|大厅|ロビー|로비
Live games|Partidas en vivo|Parties en direct|Live-Spiele|Jogos ao vivo|Partite dal vivo|Игры онлайн|Canlı oyunlar|ألعاب مباشرة|משחקים חיים|लाइव गेम्स|直播对局|ライブ対局|라이브 게임
Create|Crear|Créer|Erstellen|Criar|Crea|Создать|Oluştur|إنشاء|יצירה|बनाएं|创作|作成|만들기
Rewards|Recompensas|Récompenses|Belohnungen|Recompensas|Premi|Награды|Ödüller|المكافآت|פרסים|इनाम|奖励|報酬|보상
Membership|Membresía|Abonnement|Mitgliedschaft|Assinatura|Abbonamento|Подписка|Üyelik|العضوية|מנוי|सदस्यता|会员|メンバーシップ|멤버십
Donate|Donar|Faire un don|Spenden|Doar|Dona|Пожертвовать|Bağış yap|تبرّع|תרומה|दान करें|捐赠|寄付する|기부하기
Developer|Desarrollador|Développeur|Entwickler|Desenvolvedor|Sviluppatore|Разработчик|Geliştirici|المطوّر|מפתח|डेवलपर|开发者|開発者|개발자
Search games, people, posts|Busca juegos, personas, publicaciones|Rechercher jeux, personnes, posts|Spiele, Leute, Beiträge suchen|Buscar jogos, pessoas, posts|Cerca giochi, persone, post|Поиск игр, людей, постов|Oyun, kişi, gönderi ara|ابحث عن ألعاب وأشخاص ومنشورات|חיפוש משחקים, אנשים, פוסטים|गेम, लोग, पोस्ट खोजें|搜索游戏、用户、帖子|ゲーム・人・投稿を検索|게임, 사람, 게시물 검색
Sign in|Iniciar sesión|Se connecter|Anmelden|Entrar|Accedi|Войти|Giriş yap|تسجيل الدخول|התחברות|साइन इन|登录|ログイン|로그인
Download|Descargar|Télécharger|Herunterladen|Baixar|Scarica|Скачать|İndir|تنزيل|הורדה|डाउनलोड|下载|ダウンロード|다운로드
Settings|Ajustes|Paramètres|Einstellungen|Configurações|Impostazioni|Настройки|Ayarlar|الإعدادات|הגדרות|सेटिंग्स|设置|設定|설정
Notifications|Notificaciones|Notifications|Benachrichtigungen|Notificações|Notifiche|Уведомления|Bildirimler|الإشعارات|התראות|सूचनाएं|通知|通知|알림
Share David’s Game World|Compartir David’s Game World|Partager David’s Game World|David’s Game World teilen|Compartilhar David’s Game World|Condividi David’s Game World|Поделиться David’s Game World|David’s Game World'ı paylaş|شارك David’s Game World|שתפו את David’s Game World|David’s Game World शेयर करें|分享 David’s Game World|David’s Game Worldを共有|David’s Game World 공유
Background music|Música de fondo|Musique de fond|Hintergrundmusik|Música de fundo|Musica di sottofondo|Фоновая музыка|Arka plan müziği|موسيقى الخلفية|מוזיקת רקע|पृष्ठभूमि संगीत|背景音乐|BGM|배경 음악
Sound effects|Efectos de sonido|Effets sonores|Soundeffekte|Efeitos sonoros|Effetti sonori|Звуковые эффекты|Ses efektleri|المؤثرات الصوتية|אפקטים קוליים|ध्वनि प्रभाव|音效|効果音|효과음
All games|Todos los juegos|Tous les jeux|Alle Spiele|Todos os jogos|Tutti i giochi|Все игры|Tüm oyunlar|كل الألعاب|כל המשחקים|सभी गेम|全部游戏|すべてのゲーム|모든 게임
Download the app|Descarga la app|Télécharger l'app|App herunterladen|Baixe o app|Scarica l'app|Скачать приложение|Uygulamayı indir|نزّل التطبيق|הורידו את האפליקציה|ऐप डाउनलोड करें|下载应用|アプリをダウンロード|앱 다운로드
Company|Empresa|Entreprise|Unternehmen|Empresa|Azienda|Компания|Şirket|الشركة|החברה|कंपनी|公司|会社|회사
About us|Sobre nosotros|À propos|Über uns|Sobre nós|Chi siamo|О нас|Hakkımızda|من نحن|אודות|हमारे बारे में|关于我们|会社概要|회사 소개
Contact us|Contacto|Nous contacter|Kontakt|Fale conosco|Contattaci|Связаться с нами|Bize ulaşın|اتصل بنا|צור קשר|संपर्क करें|联系我们|お問い合わせ|문의하기
Press|Prensa|Presse|Presse|Imprensa|Stampa|Пресса|Basın|الصحافة|עיתונות|प्रेस|媒体|プレス|보도
Help|Ayuda|Aide|Hilfe|Ajuda|Aiuto|Помощь|Yardım|المساعدة|עזרה|सहायता|帮助|ヘルプ|도움말
User's manual|Manual de usuario|Guide d'utilisation|Benutzerhandbuch|Manual do usuário|Manuale utente|Руководство|Kullanım kılavuzu|دليل المستخدم|מדריך למשתמש|उपयोगकर्ता पुस्तिका|用户手册|ユーザーマニュアル|사용 설명서
FAQ|Preguntas frecuentes|FAQ|FAQ|Perguntas frequentes|FAQ|Вопросы и ответы|SSS|الأسئلة الشائعة|שאלות נפוצות|अक्सर पूछे जाने वाले प्रश्न|常见问题|よくある質問|자주 묻는 질문
Keyboard shortcuts|Atajos de teclado|Raccourcis clavier|Tastenkürzel|Atalhos de teclado|Scorciatoie da tastiera|Горячие клавиши|Klavye kısayolları|اختصارات لوحة المفاتيح|קיצורי מקלדת|कीबोर्ड शॉर्टकट|键盘快捷键|キーボードショートカット|단축키
Accessibility|Accesibilidad|Accessibilité|Barrierefreiheit|Acessibilidade|Accessibilità|Доступность|Erişilebilirlik|إمكانية الوصول|נגישות|सुलभता|无障碍|アクセシビリティ|접근성
Legal|Legal|Mentions légales|Rechtliches|Jurídico|Note legali|Правовая информация|Yasal|قانوني|משפטי|कानूनी|法律|法的情報|법적 고지
Terms of Service|Términos del servicio|Conditions d'utilisation|Nutzungsbedingungen|Termos de serviço|Termini di servizio|Условия использования|Hizmet Şartları|شروط الخدمة|תנאי השירות|सेवा की शर्तें|服务条款|利用規約|서비스 약관
Privacy Policy|Política de privacidad|Politique de confidentialité|Datenschutzerklärung|Política de privacidade|Informativa sulla privacy|Политика конфиденциальности|Gizlilik Politikası|سياسة الخصوصية|מדיניות פרטיות|गोपनीयता नीति|隐私政策|プライバシーポリシー|개인정보 처리방침
Cookie Policy|Política de cookies|Politique relative aux cookies|Cookie-Richtlinie|Política de cookies|Cookie policy|Политика cookie|Çerez Politikası|سياسة ملفات تعريف الارتباط|מדיניות עוגיות|कुकी नीति|Cookie 政策|Cookieポリシー|쿠키 정책
Refunds and cancellations|Reembolsos y cancelaciones|Remboursements et annulations|Erstattungen und Kündigungen|Reembolsos e cancelamentos|Rimborsi e cancellazioni|Возвраты и отмена|İade ve iptal|الاسترداد والإلغاء|החזרים וביטולים|रिफंड और रद्दीकरण|退款与取消|返金とキャンセル|환불 및 취소
Community guidelines|Normas de la comunidad|Règles de la communauté|Community-Richtlinien|Diretrizes da comunidade|Linee guida della community|Правила сообщества|Topluluk kuralları|إرشادات المجتمع|הנחיות הקהילה|सामुदायिक दिशानिर्देश|社区准则|コミュニティガイドライン|커뮤니티 가이드라인
Licences and credits|Licencias y créditos|Licences et crédits|Lizenzen und Danksagungen|Licenças e créditos|Licenze e crediti|Лицензии и благодарности|Lisanslar ve emeği geçenler|التراخيص والشكر|רישיונות וקרדיטים|लाइसेंस और श्रेय|许可与致谢|ライセンスとクレジット|라이선스 및 크레딧
Play games, make friends.|Juega y haz amigos.|Jouez et faites-vous des amis.|Spielen und Freunde finden.|Jogue e faça amigos.|Gioca e fatti degli amici.|Играйте и находите друзей.|Oyna, arkadaş edin.|العب وكوّن صداقات.|שחקו והכירו חברים.|गेम खेलें, दोस्त बनाएं।|玩游戏，交朋友。|遊んで、友達をつくろう。|게임하고 친구 사귀기.
Top games tonight|Juegos destacados de hoy|Les jeux phares du soir|Top-Spiele heute Abend|Jogos em alta hoje|I giochi top di stasera|Лучшие игры сегодня|Bu akşamın en iyi oyunları|أفضل ألعاب الليلة|המשחקים המובילים הערב|आज रात के टॉप गेम|今晚热门游戏|今夜の人気ゲーム|오늘 밤 인기 게임
Recommended for you|Recomendado para ti|Recommandé pour vous|Für dich empfohlen|Recomendado para você|Consigliati per te|Рекомендуем вам|Sana önerilenler|مقترح لك|מומלץ עבורך|आपके लिए सुझाव|为你推荐|あなたへのおすすめ|추천 게임
Collections|Colecciones|Collections|Sammlungen|Coleções|Raccolte|Подборки|Koleksiyonlar|المجموعات|אוספים|संग्रह|合集|コレクション|컬렉션
Browse by tag|Explorar por etiqueta|Parcourir par tag|Nach Tag stöbern|Navegar por tag|Sfoglia per tag|Обзор по тегам|Etikete göre göz at|تصفّح حسب الوسم|עיון לפי תגית|टैग से ब्राउज़ करें|按标签浏览|タグで探す|태그별 보기
Recently played|Jugados recientemente|Joués récemment|Zuletzt gespielt|Jogados recentemente|Giocati di recente|Недавние игры|Son oynananlar|لُعبت مؤخرًا|שוחקו לאחרונה|हाल ही में खेले|最近玩过|最近プレイ|최근 플레이
Favourites|Favoritos|Favoris|Favoriten|Favoritos|Preferiti|Избранное|Favoriler|المفضلة|מועדפים|पसंदीदा|收藏|お気に入り|즐겨찾기
Your turn|Tu turno|À vous de jouer|Du bist dran|Sua vez|Tocca a te|Ваш ход|Sıra sende|دورك|תורך|आपकी बारी|轮到你了|あなたの番|당신 차례
The full library|La biblioteca completa|La ludothèque complète|Die ganze Bibliothek|A biblioteca completa|La libreria completa|Вся библиотека|Tüm kütüphane|المكتبة الكاملة|הספרייה המלאה|पूरी लाइब्रेरी|全部游戏库|全ライブラリ|전체 라이브러리
Search the library|Buscar en la biblioteca|Rechercher dans la ludothèque|Bibliothek durchsuchen|Buscar na biblioteca|Cerca nella libreria|Поиск по библиотеке|Kütüphanede ara|ابحث في المكتبة|חיפוש בספרייה|लाइब्रेरी में खोजें|搜索游戏库|ライブラリを検索|라이브러리 검색
Surprise me|Sorpréndeme|Surprenez-moi|Überrasch mich|Me surpreenda|Sorprendimi|Удиви меня|Beni şaşırt|فاجئني|תפתיעו אותי|मुझे चौंकाओ|随便来一个|おまかせ|아무거나
Players|Jugadores|Joueurs|Spieler|Jogadores|Giocatori|Игроки|Oyuncular|اللاعبون|שחקנים|खिलाड़ी|玩家|プレイヤー|플레이어
Sort|Ordenar|Trier|Sortieren|Ordenar|Ordina|Сортировка|Sırala|ترتيب|מיון|क्रम|排序|並べ替え|정렬
Any number|Cualquier número|N'importe combien|Beliebig viele|Qualquer número|Qualsiasi numero|Любое число|Herhangi bir sayı|أي عدد|כל מספר|कोई भी संख्या|任意人数|何人でも|아무 인원
Solo|Solo|Solo|Solo|Solo|Da solo|Одиночная|Tek kişilik|فردي|יחיד|एकल|单人|ソロ|솔로
2 players|2 jugadores|2 joueurs|2 Spieler|2 jogadores|2 giocatori|2 игрока|2 oyuncu|لاعبان|2 שחקנים|2 खिलाड़ी|2 人|2 人|2인
Most popular|Más populares|Les plus populaires|Am beliebtesten|Mais populares|Più popolari|Популярные|En popüler|الأكثر شعبية|הפופולריים ביותר|सबसे लोकप्रिय|最受欢迎|人気順|인기순
Most played|Más jugados|Les plus joués|Am meisten gespielt|Mais jogados|Più giocati|Чаще всего|En çok oynanan|الأكثر لعبًا|הכי משוחקים|सबसे ज़्यादा खेले गए|玩得最多|プレイ数順|가장 많이 플레이
Top rated|Mejor valorados|Les mieux notés|Am besten bewertet|Mais bem avaliados|Più votati|Лучшие оценки|En yüksek puan|الأعلى تقييمًا|המדורגים ביותר|टॉप रेटेड|评分最高|高評価順|평점순
Newest|Más nuevos|Les plus récents|Neueste|Mais novos|Più recenti|Новые|En yeni|الأحدث|החדשים ביותר|नवीनतम|最新|新着順|최신순
A to Z|A a Z|A à Z|A bis Z|A a Z|Dalla A alla Z|А–Я|A'dan Z'ye|أ إلى ي|א עד ת|A से Z|按字母|名前順|이름순
All|Todo|Tout|Alle|Tudo|Tutti|Все|Tümü|الكل|הכול|सभी|全部|すべて|전체
New|Nuevo|Nouveau|Neu|Novo|Nuovo|Новое|Yeni|جديد|חדש|नया|新|新着|신규
Today's quests|Misiones de hoy|Quêtes du jour|Heutige Aufgaben|Missões de hoje|Missioni di oggi|Задания дня|Günün görevleri|مهام اليوم|המשימות של היום|आज के क्वेस्ट|今日任务|今日のクエスト|오늘의 퀘스트
All rewards|Todas las recompensas|Toutes les récompenses|Alle Belohnungen|Todas as recompensas|Tutti i premi|Все награды|Tüm ödüller|كل المكافآت|כל הפרסים|सभी इनाम|全部奖励|すべての報酬|모든 보상
Have a join code?|¿Tienes un código?|Un code d'accès ?|Einladungscode?|Tem um código?|Hai un codice?|Есть код?|Katılım kodun var mı?|لديك رمز انضمام؟|יש לך קוד?|जॉइन कोड है?|有加入码？|参加コードをお持ちですか？|참가 코드가 있나요?
Join|Unirse|Rejoindre|Beitreten|Entrar|Unisciti|Присоединиться|Katıl|انضم|הצטרפות|जुड़ें|加入|参加|참가
Play today's challenge|Jugar el reto de hoy|Jouer le défi du jour|Heutige Challenge spielen|Jogar o desafio de hoje|Gioca la sfida di oggi|Сыграть задание дня|Günün mücadelesini oyna|العب تحدي اليوم|לשחק באתגר היומי|आज की चुनौती खेलें|玩今日挑战|今日のチャレンジに挑戦|오늘의 도전 하기
Find a game|Buscar partida|Trouver une partie|Spiel finden|Encontrar partida|Trova una partita|Найти игру|Oyun bul|ابحث عن مباراة|מצא משחק|गेम खोजें|寻找对局|対戦を探す|게임 찾기
See event|Ver evento|Voir l'événement|Event ansehen|Ver evento|Vedi evento|К событию|Etkinliği gör|عرض الفعالية|לאירוע|इवेंट देखें|查看活动|イベントを見る|이벤트 보기
Play now|Jugar ahora|Jouer|Jetzt spielen|Jogar agora|Gioca ora|Играть|Şimdi oyna|العب الآن|שחקו עכשיו|अभी खेलें|立即开玩|今すぐプレイ|지금 플레이
Board|Tablero|Plateau|Brett|Tabuleiro|Da tavolo|Настольные|Masa|ألواح|לוח|बोर्ड|棋类|ボード|보드
Card|Cartas|Cartes|Karten|Cartas|Carte|Карточные|Kart|ورق|קלפים|कार्ड|纸牌|カード|카드
Dice|Dados|Dés|Würfel|Dados|Dadi|Кости|Zar|نرد|קוביות|पासा|骰子|ダイス|주사위
Puzzle|Puzles|Réflexion|Rätsel|Quebra-cabeças|Rompicapo|Головоломки|Bulmaca|ألغاز|פאזלים|पहेली|益智|パズル|퍼즐
Word|Palabras|Lettres|Wörter|Palavras|Parole|Слова|Kelime|كلمات|מילים|शब्द|文字|ことば|단어
Arcade|Arcade|Arcade|Arcade|Arcade|Arcade|Аркады|Arcade|آركيد|ארקייד|आर्केड|街机|アーケード|아케이드
Party|Fiesta|Soirée|Party|Festa|Party|Вечеринки|Parti|حفلات|מסיבה|पार्टी|聚会|パーティー|파티
Strategy|Estrategia|Stratégie|Strategie|Estratégia|Strategia|Стратегия|Strateji|استراتيجية|אסטרטגיה|रणनीति|策略|戦略|전략
Classic|Clásico|Classique|Klassiker|Clássico|Classico|Классика|Klasik|كلاسيكي|קלאסי|क्लासिक|经典|クラシック|클래식
Two-player|Dos jugadores|Deux joueurs|Zwei Spieler|Dois jogadores|Due giocatori|На двоих|İki kişilik|لاعبان|שני שחקנים|दो खिलाड़ी|双人|2人用|2인용
Family|Familia|Famille|Familie|Família|Famiglia|Семейные|Aile|عائلي|משפחה|परिवार|家庭|ファミリー|가족
Luck|Suerte|Chance|Glück|Sorte|Fortuna|Удача|Şans|حظ|מזל|किस्मत|运气|運|운
Quick|Rápido|Rapide|Schnell|Rápido|Veloce|Быстрые|Hızlı|سريع|מהיר|तेज़|快速|手軽|빠른
Brain training|Entrenamiento mental|Entraînement cérébral|Gehirnjogging|Treino mental|Allenamento mentale|Тренировка мозга|Beyin egzersizi|تمرين العقل|אימון מוח|दिमागी कसरत|脑力训练|脳トレ|두뇌 훈련
Rules|Reglas|Règles|Regeln|Regras|Regole|Правила|Kurallar|القواعد|חוקים|नियम|规则|ルール|규칙
Guide|Guía|Guide|Anleitung|Guia|Guida|Гид|Rehber|الدليل|מדריך|गाइड|指南|ガイド|가이드
Highscores|Récords|Meilleurs scores|Bestenliste|Recordes|Record|Рекорды|En yüksek skorlar|أعلى النتائج|שיאים|उच्च स्कोर|高分榜|ハイスコア|최고 점수
Reviews|Reseñas|Avis|Bewertungen|Avaliações|Recensioni|Отзывы|Yorumlar|المراجعات|ביקורות|समीक्षाएं|评价|レビュー|리뷰
Comments|Comentarios|Commentaires|Kommentare|Comentários|Commenti|Комментарии|Yorumlar|التعليقات|תגובות|टिप्पणियां|评论|コメント|댓글
Play vs computer|Jugar contra la computadora|Jouer contre l'ordinateur|Gegen den Computer|Jogar contra o computador|Gioca contro il computer|Играть с компьютером|Bilgisayara karşı oyna|العب ضد الكمبيوتر|שחק נגד המחשב|कंप्यूटर से खेलें|与电脑对战|コンピューターと対戦|컴퓨터와 대전
Play|Jugar|Jouer|Spielen|Jogar|Gioca|Играть|Oyna|العب|שחק|खेलें|开始|プレイ|플레이
Quick match|Partida rápida|Partie rapide|Schnelles Spiel|Partida rápida|Partita veloce|Быстрая игра|Hızlı maç|مباراة سريعة|משחק מהיר|क्विक मैच|快速匹配|クイック対戦|빠른 대전
Open an online table|Abrir una mesa en línea|Ouvrir une table en ligne|Online-Tisch eröffnen|Abrir mesa online|Apri un tavolo online|Открыть стол онлайн|Çevrimiçi masa aç|افتح طاولة على الإنترنت|פתח שולחן מקוון|ऑनलाइन टेबल खोलें|开设在线牌桌|オンライン卓を作成|온라인 테이블 열기
Challenge friends or a group|Retar a amigos o a un grupo|Défier des amis ou un groupe|Freunde oder Gruppe herausfordern|Desafiar amigos ou um grupo|Sfida amici o un gruppo|Вызвать друзей или группу|Arkadaşlara meydan oku|تحدَّ أصدقاءك أو مجموعة|אתגר חברים או קבוצה|दोस्तों या ग्रुप को चुनौती दें|挑战好友或群组|友達やグループに挑戦|친구나 그룹에 도전
Pass & play on this device|Pasar y jugar en este dispositivo|Jouer à plusieurs sur cet appareil|Abwechselnd auf diesem Gerät|Passar e jogar neste aparelho|Passa e gioca su questo dispositivo|Играть по очереди на этом устройстве|Bu cihazda sırayla oyna|العب بالتناوب على هذا الجهاز|משחק משותף במכשיר זה|इसी डिवाइस पर बारी-बारी खेलें|同屏轮流玩|この端末で交代プレイ|이 기기에서 번갈아 플레이
Resign|Abandonar|Abandonner|Aufgeben|Desistir|Abbandona|Сдаться|Pes et|استسلام|כניעה|हार मानें|认输|投了|기권
New game|Nueva partida|Nouvelle partie|Neues Spiel|Novo jogo|Nuova partita|Новая игра|Yeni oyun|لعبة جديدة|משחק חדש|नया गेम|新游戏|新しいゲーム|새 게임
Back to setup|Volver a la configuración|Retour aux réglages|Zurück zur Einrichtung|Voltar à configuração|Torna alla configurazione|Назад к настройке|Kuruluma dön|العودة إلى الإعداد|חזרה להגדרות|सेटअप पर वापस|返回设置|設定に戻る|설정으로 돌아가기
Play again|Jugar de nuevo|Rejouer|Nochmal spielen|Jogar de novo|Gioca ancora|Сыграть ещё|Tekrar oyna|العب مجددًا|שחק שוב|फिर से खेलें|再玩一次|もう一度|다시 하기
Watch replay|Ver repetición|Revoir la partie|Wiederholung ansehen|Ver replay|Guarda il replay|Смотреть запись|Tekrarı izle|شاهد الإعادة|צפה בשידור חוזר|रीप्ले देखें|观看回放|リプレイを見る|리플레이 보기
Fullscreen|Pantalla completa|Plein écran|Vollbild|Tela cheia|Schermo intero|Во весь экран|Tam ekran|ملء الشاشة|מסך מלא|फ़ुलस्क्रीन|全屏|全画面|전체 화면
Screenshot|Captura|Capture d'écran|Screenshot|Captura de tela|Screenshot|Скриншот|Ekran görüntüsü|لقطة شاشة|צילום מסך|स्क्रीनशॉट|截图|スクリーンショット|스크린샷
Make a clip|Crear un clip|Créer un clip|Clip erstellen|Criar um clipe|Crea una clip|Сделать клип|Klip oluştur|أنشئ مقطعًا|צור קליפ|क्लिप बनाएं|制作片段|クリップを作成|클립 만들기
Controls|Controles|Commandes|Steuerung|Controles|Comandi|Управление|Kontroller|التحكم|שליטה|नियंत्रण|操作|操作方法|조작
You might also like|También te puede gustar|Vous aimerez aussi|Das könnte dir auch gefallen|Você também pode gostar|Potrebbe piacerti anche|Вам может понравиться|Bunları da sevebilirsin|قد يعجبك أيضًا|אולי תאהבו גם|आपको यह भी पसंद आ सकता है|你可能也喜欢|こちらもおすすめ|이런 게임도 좋아요
Add to favourites|Añadir a favoritos|Ajouter aux favoris|Zu Favoriten|Adicionar aos favoritos|Aggiungi ai preferiti|В избранное|Favorilere ekle|أضف إلى المفضلة|הוסף למועדפים|पसंदीदा में जोड़ें|加入收藏|お気に入りに追加|즐겨찾기에 추가
Post|Publicar|Publier|Posten|Publicar|Pubblica|Опубликовать|Paylaş|نشر|פרסום|पोस्ट करें|发布|投稿|게시
Like|Me gusta|J'aime|Gefällt mir|Curtir|Mi piace|Нравится|Beğen|إعجاب|לייק|पसंद|赞|いいね|좋아요
Reply|Responder|Répondre|Antworten|Responder|Rispondi|Ответить|Yanıtla|رد|השב|जवाब दें|回复|返信|답장
Share|Compartir|Partager|Teilen|Compartilhar|Condividi|Поделиться|Paylaş|مشاركة|שיתוף|शेयर करें|分享|共有|공유
Report|Denunciar|Signaler|Melden|Denunciar|Segnala|Пожаловаться|Bildir|إبلاغ|דיווח|रिपोर्ट करें|举报|報告|신고
Block|Bloquear|Bloquer|Blockieren|Bloquear|Blocca|Заблокировать|Engelle|حظر|חסימה|ब्लॉक करें|屏蔽|ブロック|차단
Save|Guardar|Enregistrer|Speichern|Salvar|Salva|Сохранить|Kaydet|حفظ|שמירה|सहेजें|保存|保存|저장
Save changes|Guardar cambios|Enregistrer|Änderungen speichern|Salvar alterações|Salva modifiche|Сохранить изменения|Değişiklikleri kaydet|حفظ التغييرات|שמירת שינויים|बदलाव सहेजें|保存更改|変更を保存|변경 사항 저장
Cancel|Cancelar|Annuler|Abbrechen|Cancelar|Annulla|Отмена|İptal|إلغاء|ביטול|रद्द करें|取消|キャンセル|취소
Delete|Eliminar|Supprimer|Löschen|Excluir|Elimina|Удалить|Sil|حذف|מחיקה|हटाएं|删除|削除|삭제
Edit|Editar|Modifier|Bearbeiten|Editar|Modifica|Изменить|Düzenle|تعديل|עריכה|संपादित करें|编辑|編集|편집
Send|Enviar|Envoyer|Senden|Enviar|Invia|Отправить|Gönder|إرسال|שליחה|भेजें|发送|送信|보내기
Close|Cerrar|Fermer|Schließen|Fechar|Chiudi|Закрыть|Kapat|إغلاق|סגירה|बंद करें|关闭|閉じる|닫기
Continue|Continuar|Continuer|Weiter|Continuar|Continua|Продолжить|Devam|متابعة|המשך|जारी रखें|继续|続ける|계속
Everyone|Todos|Tout le monde|Alle|Todos|Tutti|Все|Herkes|الجميع|כולם|सभी|所有人|全員|모두
Friends only|Solo amigos|Amis seulement|Nur Freunde|Só amigos|Solo amici|Только друзья|Sadece arkadaşlar|الأصدقاء فقط|חברים בלבד|सिर्फ़ दोस्त|仅好友|友達のみ|친구만
Audience|Público|Audience|Publikum|Público|Pubblico|Аудитория|Kitle|الجمهور|קהל|दर्शक|可见范围|公開範囲|공개 범위
What's on your mind? Add #tags|¿Qué estás pensando? Añade #etiquetas|Quoi de neuf ? Ajoutez des #tags|Was gibt's Neues? #Tags hinzufügen|No que você está pensando? Adicione #tags|A cosa stai pensando? Aggiungi #tag|Что нового? Добавьте #теги|Aklında ne var? #etiket ekle|بمَ تفكر؟ أضف #وسوم|מה חדש? הוסיפו #תגיות|आपके मन में क्या है? #टैग जोड़ें|在想什么？添加 #标签|いまどうしてる？ #タグを追加|무슨 생각을 하고 있나요? #태그 추가
Trending tags|Tendencias|Tendances|Trends|Em alta|Tendenze|Популярные теги|Gündem|الوسوم الرائجة|תגיות חמות|ट्रेंडिंग टैग|热门标签|トレンドタグ|인기 태그
Following|Siguiendo|Abonnements|Folge ich|Seguindo|Seguiti|Подписки|Takip edilenler|المتابَعون|במעקב|फ़ॉलो कर रहे हैं|关注中|フォロー中|팔로잉
People you may know|Personas que quizá conozcas|Vous les connaissez peut-être|Leute, die du kennen könntest|Pessoas que você talvez conheça|Persone che potresti conoscere|Возможные знакомые|Tanıyor olabileceğin kişiler|أشخاص قد تعرفهم|אנשים שאולי תכירו|आप इन्हें जानते होंगे|你可能认识的人|知り合いかも|알 수도 있는 사람
Add photo|Añadir foto|Ajouter une photo|Foto hinzufügen|Adicionar foto|Aggiungi foto|Добавить фото|Fotoğraf ekle|إضافة صورة|הוספת תמונה|फ़ोटो जोड़ें|添加照片|写真を追加|사진 추가
Video|Vídeo|Vidéo|Video|Vídeo|Video|Видео|Video|فيديو|וידאו|वीडियो|视频|動画|동영상
Poll|Encuesta|Sondage|Umfrage|Enquete|Sondaggio|Опрос|Anket|استطلاع|סקר|पोल|投票|アンケート|투표
Achievements|Logros|Succès|Erfolge|Conquistas|Obiettivi|Достижения|Başarımlar|الإنجازات|הישגים|उपलब्धियां|成就|実績|업적
Shop|Tienda|Boutique|Shop|Loja|Negozio|Магазин|Mağaza|المتجر|חנות|दुकान|商店|ショップ|상점
Account|Cuenta|Compte|Konto|Conta|Account|Аккаунт|Hesap|الحساب|חשבון|खाता|账户|アカウント|계정
Sign out|Cerrar sesión|Se déconnecter|Abmelden|Sair|Esci|Выйти|Çıkış yap|تسجيل الخروج|התנתקות|साइन आउट|退出登录|ログアウト|로그아웃
All time|Histórico|Depuis toujours|Gesamt|Todos os tempos|Di sempre|За всё время|Tüm zamanlar|كل الأوقات|כל הזמנים|सर्वकालिक|总榜|全期間|전체 기간
This month|Este mes|Ce mois-ci|Dieser Monat|Este mês|Questo mese|Этот месяц|Bu ay|هذا الشهر|החודש|इस महीने|本月|今月|이번 달
This week|Esta semana|Cette semaine|Diese Woche|Esta semana|Questa settimana|Эта неделя|Bu hafta|هذا الأسبوع|השבוע|इस सप्ताह|本周|今週|이번 주
Country|País|Pays|Land|País|Paese|Страна|Ülke|الدولة|מדינה|देश|国家/地区|国|국가
Everywhere|Todo el mundo|Partout|Überall|Todo o mundo|Ovunque|Везде|Her yer|كل مكان|בכל מקום|हर जगह|全球|全世界|전 세계
Player|Jugador|Joueur|Spieler|Jogador|Giocatore|Игрок|Oyuncu|اللاعب|שחקן|खिलाड़ी|玩家|プレイヤー|플레이어
Rating|Puntuación|Classement Elo|Wertung|Rating|Punteggio|Рейтинг|Puan|التصنيف|דירוג|रेटिंग|等级分|レーティング|레이팅
Points|Puntos|Points|Punkte|Pontos|Punti|Очки|Puan|النقاط|נקודות|अंक|积分|ポイント|점수
Language|Idioma|Langue|Sprache|Idioma|Lingua|Язык|Dil|اللغة|שפה|भाषा|语言|言語|언어
Reduce motion|Reducir movimiento|Réduire les animations|Bewegung reduzieren|Reduzir movimento|Riduci animazioni|Меньше анимации|Hareketi azalt|تقليل الحركة|הפחתת תנועה|गति कम करें|减少动效|動きを減らす|움직임 줄이기
High contrast|Alto contraste|Contraste élevé|Hoher Kontrast|Alto contraste|Contrasto elevato|Высокий контраст|Yüksek kontrast|تباين عالٍ|ניגודיות גבוהה|उच्च कंट्रास्ट|高对比度|ハイコントラスト|고대비
Larger tap targets|Botones más grandes|Zones tactiles agrandies|Größere Tippflächen|Alvos de toque maiores|Pulsanti più grandi|Крупные кнопки|Daha büyük dokunma alanları|أهداف لمس أكبر|אזורי מגע גדולים|बड़े टैप लक्ष्य|更大的点按区域|タップ領域を大きく|더 큰 터치 영역
Open challenges|Retos abiertos|Défis ouverts|Offene Herausforderungen|Desafios abertos|Sfide aperte|Открытые вызовы|Açık meydan okumalar|التحديات المفتوحة|אתגרים פתוחים|खुली चुनौतियां|公开挑战|募集中の対局|열린 도전
Create a tournament|Crear un torneo|Créer un tournoi|Turnier erstellen|Criar um torneio|Crea un torneo|Создать турнир|Turnuva oluştur|أنشئ بطولة|צור טורניר|टूर्नामेंट बनाएं|创建锦标赛|トーナメントを作成|토너먼트 만들기
Standings|Clasificación|Classement|Tabelle|Classificação|Classifica|Турнирная таблица|Sıralama|الترتيب|טבלה|स्थिति|排名|順位|순위
Live streams|Directos|Diffusions en direct|Livestreams|Transmissões ao vivo|Dirette|Трансляции|Canlı yayınlar|البث المباشر|שידורים חיים|लाइव स्ट्रीम|直播|ライブ配信|라이브 방송
Go live with camera|Emitir con cámara|Diffuser avec la caméra|Mit Kamera live gehen|Transmitir com câmera|Vai in diretta con la fotocamera|Эфир с камеры|Kamerayla yayın aç|ابدأ البث بالكاميرا|שידור חי עם מצלמה|कैमरे से लाइव जाएं|用摄像头直播|カメラで配信|카메라로 방송하기
Stream my screen|Emitir mi pantalla|Diffuser mon écran|Bildschirm streamen|Transmitir minha tela|Trasmetti lo schermo|Транслировать экран|Ekranımı yayınla|بث شاشتي|שידור המסך שלי|मेरी स्क्रीन स्ट्रीम करें|直播我的屏幕|画面を配信|내 화면 방송하기
Make a quiz|Crear un cuestionario|Créer un quiz|Quiz erstellen|Criar um quiz|Crea un quiz|Создать викторину|Test oluştur|أنشئ اختبارًا|צור חידון|क्विज़ बनाएं|制作测验|クイズを作る|퀴즈 만들기
Make a word search|Crear una sopa de letras|Créer des mots mêlés|Wortsuchrätsel erstellen|Criar um caça-palavras|Crea un cerca parole|Создать филворд|Kelime avı oluştur|أنشئ لعبة بحث عن الكلمات|צור תפזורת|शब्द खोज बनाएं|制作找词游戏|単語探しを作る|단어 찾기 만들기
Coins|Monedas|Pièces|Münzen|Moedas|Monete|Монеты|Jeton|العملات|מטבעות|सिक्के|金币|コイン|코인
Streak|Racha|Série|Serie|Sequência|Serie|Серия|Seri|سلسلة|רצף|स्ट्रीक|连胜|連続記録|연속
Quests & streak|Misiones y racha|Quêtes et série|Aufgaben & Serie|Missões e sequência|Missioni e serie|Задания и серия|Görevler ve seri|المهام والسلسلة|משימות ורצף|क्वेस्ट और स्ट्रीक|任务与连续|クエストと連続記録|퀘스트 및 연속
Invite friends|Invitar amigos|Inviter des amis|Freunde einladen|Convidar amigos|Invita amici|Пригласить друзей|Arkadaşlarını davet et|ادعُ أصدقاءك|הזמינו חברים|दोस्तों को बुलाएं|邀请好友|友達を招待|친구 초대
Leave|Salir|Quitter|Verlassen|Sair|Esci|Выйти|Ayrıl|مغادرة|עזיבה|छोड़ें|离开|退出|나가기
Start|Empezar|Commencer|Starten|Começar|Inizia|Начать|Başla|ابدأ|התחל|शुरू करें|开始|開始|시작
Rematch|Revancha|Revanche|Revanche|Revanche|Rivincita|Реванш|Rövanş|إعادة المباراة|משחק חוזר|दोबारा मैच|再来一局|再戦|재대결
Offer draw|Ofrecer tablas|Proposer nulle|Remis anbieten|Oferecer empate|Proponi patta|Предложить ничью|Beraberlik teklif et|اعرض التعادل|הצע תיקו|ड्रॉ का प्रस्ताव|提议和棋|引き分けを提案|무승부 제안
Join voice chat|Unirse al chat de voz|Rejoindre le chat vocal|Sprachchat beitreten|Entrar no chat de voz|Entra in chat vocale|Голосовой чат|Sesli sohbete katıl|انضم إلى الدردشة الصوتية|הצטרף לצ'אט קולי|वॉइस चैट से जुड़ें|加入语音聊天|ボイスチャットに参加|음성 채팅 참가
Join video chat|Unirse al videochat|Rejoindre le chat vidéo|Videochat beitreten|Entrar no chat de vídeo|Entra in videochat|Видеочат|Görüntülü sohbete katıl|انضم إلى دردشة الفيديو|הצטרף לצ'אט וידאו|वीडियो चैट से जुड़ें|加入视频聊天|ビデオチャットに参加|화상 채팅 참가
Call|Llamar|Appeler|Anrufen|Ligar|Chiama|Позвонить|Ara|اتصال|שיחה|कॉल करें|通话|通話|통화
Video call|Videollamada|Appel vidéo|Videoanruf|Chamada de vídeo|Videochiamata|Видеозвонок|Görüntülü arama|مكالمة فيديو|שיחת וידאו|वीडियो कॉल|视频通话|ビデオ通話|영상 통화`;
const I18N = (() => { const d = {}; for (const line of I18N_SRC.split('\n')) { const p = line.split('|'); if (p.length !== LANGS.length) { console.warn('i18n row', p[0], p.length); continue; } LANGS.forEach(([c], i) => { if (i) (d[c] = d[c] || {})[p[0]] = p[i]; }); } return d; })();
const NUMP = { es: 'jugadores', fr: 'joueurs', de: 'Spieler', pt: 'jogadores', it: 'giocatori', ru: 'игроков', tr: 'oyuncu', ar: 'لاعبين', he: 'שחקנים', hi: 'खिलाड़ी', zh: '人', ja: '人', ko: '명' };
const Lang = {
  cur: LS.get('lang', '') || (() => { const n = (navigator.language || 'en').slice(0, 2); return LANGS.some(l => l[0] === n) ? n : 'en'; })(),
  t(s) { const d = I18N[this.cur]; if (!d || !s) return null; const k = s.trim(); if (d[k]) return s.replace(k, d[k]);
    if (k.includes(' · ')) { const parts = k.split(' · '), out = parts.map(x => d[x] || this.pat(x) || x); if (out.some((x, i) => x !== parts[i])) return s.replace(k, out.join(' · ')); }
    const p = this.pat(k); if (p) return s.replace(k, p);
    const m = k.match(/^([^\p{L}\p{N}]+)(.+?)([^\p{L}\p{N}?.!)]*)$/u); if (m && d[m[2]]) return s.replace(k, m[1] + d[m[2]] + m[3]); return null; },
  pat(k) { const m = k.match(/^(\d+)(?:[–-](\d+))? players?$/); if (m) { const n = m[2] ? `${m[1]}–${m[2]}` : m[1], w = NUMP[this.cur]; return ['zh', 'ja'].includes(this.cur) ? `${n} ${w}` : this.cur === 'ko' ? `${n}${w}` : `${n} ${w}`; } return null; },
  skip: el => !!(el && el.closest && el.closest('script,style,textarea,input,.ptext,.msgtext,.mtext,[data-notr],.tile b,.lb td,#board,.wsgrid,code,.uq')),
  walk(root) { if (this.cur === 'en' || !root) return; const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n = root;
    do { if (n.nodeType === 3) { if (n.nodeValue.trim() && !this.skip(n.parentElement)) { const r = this.t(n.nodeValue); if (r && r !== n.nodeValue) n.nodeValue = r; } }
      else if (n.nodeType === 1 && !this.skip(n)) for (const a of ['placeholder', 'aria-label', 'title']) { const v = n.getAttribute && n.getAttribute(a); if (v) { const r = this.t(v); if (r && r !== v) n.setAttribute(a, r); } } } while ((n = tw.nextNode())); },
  set(code) { LS.set('lang', code); location.reload(); },
  apply() { const h = document.documentElement; h.lang = this.cur; h.dir = RTL.has(this.cur) ? 'rtl' : 'ltr'; if (this.cur === 'en') return; this.walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') { const n = m.target; if (n.parentElement && !this.skip(n.parentElement)) { const r = this.t(n.nodeValue); if (r && r !== n.nodeValue) n.nodeValue = r; } continue; } m.addedNodes.forEach(n => n.nodeType === 3 ? (!this.skip(n.parentElement) && (() => { const r = this.t(n.nodeValue); if (r && r !== n.nodeValue) n.nodeValue = r; })()) : this.walk(n)); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); },
  picker() { return `<label class="fld inline">🌐 <select class="langsel" aria-label="Language">${LANGS.map(([c, n]) => `<option value="${c}" ${c === this.cur ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`; } };
{ const css = document.createElement('style'); css.textContent = `[dir=rtl] #board,[dir=rtl] .board,[dir=rtl] canvas,[dir=rtl] .wsgrid,[dir=rtl] .bracket,[dir=rtl] .seekgraph,[dir=rtl] .rtcgrid{direction:ltr}[dir=rtl] .num{text-align:left}[dir=rtl] .back{display:inline-block}.footlang{margin-top:12px}.footlang select{background:transparent;color:inherit;border:1px solid currentColor;border-radius:8px;padding:4px 6px}.footlang option{color:#111}
.trbtn{border:0;background:none;color:inherit;opacity:.7;font-size:12px;cursor:pointer;text-decoration:underline;padding:0}`; document.head.appendChild(css); }
document.addEventListener('change', e => { if (e.target.classList && e.target.classList.contains('langsel')) Lang.set(e.target.value); });
// Language picker in the footer and in Settings
{ const add = () => { const f = document.getElementById('foot'); if (f && !f.querySelector('.footlang')) { const d = document.createElement('div'); d.className = 'footlang'; d.innerHTML = Lang.picker(); (f.querySelector('.footbrand, div') || f).appendChild(d); }
    const m = document.querySelector('#modal.open'); if (m && /Sound effects|Efectos de sonido|Effets sonores|Soundeffekte/.test(m.textContent) && !m.querySelector('.langsel')) { const sec = m.querySelector('section'); if (sec) sec.insertAdjacentHTML('beforebegin', `<section><h3>${esc(Lang.t('Language') || 'Language')}</h3>${Lang.picker()}<p class="muted small">Menus and buttons are translated. Game names stay in English.</p></section>`); } };
  new MutationObserver(add).observe(document.documentElement, { childList: true, subtree: true }); }
Lang.apply();

// Longer texts (game rules and guides, posts) translated on request by the server, on the public site only
const MT = { cache: {}, async run(texts) { if (!window.B44 || Lang.cur === 'en') return null; const key = Lang.cur + ':' + texts.join('\u0001'); if (this.cache[key]) return this.cache[key];
    try { const r = await B44.call('/api/gy/translate', { lang: Lang.cur, texts: texts.slice(0, 20).map(t => String(t).slice(0, 2000)) }); this.cache[key] = r.texts; return r.texts; } catch (e) { toast(e.message); return null; } } };
document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('.trbtn'); if (!b) return; const box = b.closest('[data-trbox]') || b.parentElement; const nodes = [...box.querySelectorAll('p,li,.ptext,h4')].filter(x => x.textContent.trim()).slice(0, 20);
  b.textContent = '…'; const out = await MT.run(nodes.map(n => n.textContent)); if (out) { nodes.forEach((n, i) => { if (out[i]) n.textContent = out[i]; }); b.remove(); } else b.textContent = 'Translate'; });
{ const prev = Store.onChange; Store.onChange = k => { prev(k); if (Lang.cur !== 'en' && window.B44) setTimeout(() => { const tc = document.querySelector('#tabc'); if (tc && !tc.querySelector('.trbtn')) { tc.dataset.trbox = 1; tc.insertAdjacentHTML('afterbegin', `<button class="trbtn">Translate to ${esc(LANGS.find(l => l[0] === Lang.cur)[1])}</button>`); }
    document.querySelectorAll('.post .ptext').forEach(p => { if (!p.parentElement.querySelector('.trbtn')) { p.parentElement.dataset.trbox = 1; p.insertAdjacentHTML('afterend', '<button class="trbtn">Translate</button>'); } }); }, 50); }; }
