/* =============================================
   TIRE SERVICE BOOKING APP — Main Logic
   SPA Router, Calendar, Pricing, Admin Panel
   ============================================= */

const app = {
  // ── State ──
  currentScreen: 'map',
  selectedService: null,
  calendarDate: new Date(),
  selectedDate: null,
  selectedTime: null,
  wheelCount: 4,
  history: [],

  // ── Demo Services ──
  services: [
    {
      id: 1,
      name: 'ШиноМастер',
      address: 'ул. Ленина, 45',
      rating: 4.8,
      reviews: 234,
      hours: '08:00 – 20:00',
      description: 'Профессиональный шиномонтаж с опытом 10+ лет',
      pinX: '22%', pinY: '35%'
    },
    {
      id: 2,
      name: 'КолёсоПлюс',
      address: 'пр. Мира, 112',
      rating: 4.6,
      reviews: 189,
      hours: '09:00 – 21:00',
      description: 'Быстрый шиномонтаж, балансировка, ремонт дисков',
      pinX: '55%', pinY: '28%'
    },
    {
      id: 3,
      name: 'ТайрСервис',
      address: 'ул. Гагарина, 78',
      rating: 4.9,
      reviews: 312,
      hours: '07:00 – 19:00',
      description: 'Премиум-сервис. Только лучшее оборудование.',
      pinX: '70%', pinY: '55%'
    },
    {
      id: 4,
      name: 'Шиномонтаж 24',
      address: 'ул. Победы, 33а',
      rating: 4.4,
      reviews: 156,
      hours: '00:00 – 24:00',
      description: 'Круглосуточный шиномонтаж. Работаем без выходных.',
      pinX: '38%', pinY: '65%'
    },
    {
      id: 5,
      name: 'АвтоШина',
      address: 'Новый бульвар, 5',
      rating: 4.7,
      reviews: 201,
      hours: '08:00 – 18:00',
      description: 'Семейный шиномонтаж. Честные цены, быстрая работа.',
      pinX: '82%', pinY: '40%'
    }
  ],

  // ── Default Prices ──
  defaultPrices: {
    'R13-R14': { removal: 300, balance: 150 },
    'R15-R16': { removal: 400, balance: 200 },
    'R17-R18': { removal: 500, balance: 250 },
    'R19-R20': { removal: 700, balance: 300 },
    'R21-R22': { removal: 900, balance: 350 }
  },

  // ── Schedule Defaults ──
  defaultSchedule: {
    startHour: 8,
    endHour: 18,
    slotMinutes: 60,
    daysOff: [0] // Sunday
  },

  // ── Init ──
  init() {
    this.loadPrices();
    this.loadSchedule();
    this.renderMap();
    this.handleHash();
    window.addEventListener('hashchange', () => this.handleHash());
  },

  // ── Router ──
  handleHash() {
    const hash = location.hash.slice(1) || 'map';
    const parts = hash.split('/');
    const screen = parts[0];

    if (screen === 'service' && parts[1]) {
      const id = parseInt(parts[1]);
      this.openService(id, false);
    } else if (screen === 'admin') {
      if (this.isAdminLoggedIn()) {
        this.showScreen('admin');
        this.renderAdmin();
      } else {
        this.showScreen('admin-login');
      }
    } else {
      this.showScreen(screen);
    }
  },

  navigate(screen, pushHistory = true) {
    if (pushHistory && this.currentScreen) {
      this.history.push(this.currentScreen);
    }
    location.hash = screen;
  },

  goBack() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      location.hash = prev;
    } else {
      location.hash = 'map';
    }
  },

  showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + name);
    if (el) {
      el.classList.add('active');
      el.style.animation = 'none';
      el.offsetHeight; // trigger reflow
      el.style.animation = '';
    }
    this.currentScreen = name;

    // Back button visibility
    const backBtn = document.getElementById('backBtn');
    if (name === 'map') {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
    }

    // Admin link visibility
    const adminLink = document.getElementById('adminLink');
    if (name.startsWith('admin')) {
      adminLink.classList.add('hidden');
    } else {
      adminLink.classList.remove('hidden');
    }

    window.scrollTo(0, 0);

    // Сбрасываем поля логина при каждом показе экрана
    if (name === 'admin-login') {
      const loginEl = document.getElementById('adminLogin');
      const passEl = document.getElementById('adminPassword');
      const errEl = document.getElementById('loginError');
      if (loginEl) loginEl.value = '';
      if (passEl) passEl.value = '';
      if (errEl) errEl.style.display = 'none';
    }
  },

  // ── MAP ──
  renderMap() {
    const mapArea = document.getElementById('mapArea');
    // Clear existing pins
    mapArea.querySelectorAll('.map-pin').forEach(p => p.remove());

    // Add road lines
    const roads = document.createElement('div');
    roads.innerHTML = `
      <svg style="position:absolute;width:100%;height:100%;top:0;left:0;pointer-events:none;opacity:0.08" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <path d="M0 200 Q 250 180, 500 250 T 1000 200" stroke="#6c63ff" fill="none" stroke-width="3"/>
        <path d="M0 400 Q 300 380, 600 420 T 1000 350" stroke="#6c63ff" fill="none" stroke-width="2"/>
        <path d="M200 0 Q 220 200, 180 400 T 250 600" stroke="#6c63ff" fill="none" stroke-width="2"/>
        <path d="M700 0 Q 680 150, 720 350 T 680 600" stroke="#6c63ff" fill="none" stroke-width="3"/>
        <path d="M400 0 Q 420 200, 380 350 T 450 600" stroke="#a855f7" fill="none" stroke-width="1.5"/>
      </svg>
    `;
    mapArea.appendChild(roads);

    this.services.forEach(svc => {
      const pin = document.createElement('div');
      pin.className = 'map-pin';
      pin.style.left = svc.pinX;
      pin.style.top = svc.pinY;
      pin.innerHTML = `
        <div class="pin-marker"><span>🛞</span></div>
        <div class="pin-label">
          <strong>${svc.name}</strong><br>
          <span style="color:var(--text-secondary)">${svc.address}</span><br>
          <span style="color:#f59e0b">★ ${svc.rating}</span> · ${svc.reviews} отз.
        </div>
      `;
      pin.addEventListener('click', () => this.navigate('service/' + svc.id));
      mapArea.appendChild(pin);
    });
  },

  // ── SERVICE PAGE ──
  openService(id, pushHistory = true) {
    const svc = this.services.find(s => s.id === id);
    if (!svc) return;
    this.selectedService = svc;

    document.getElementById('serviceName').textContent = svc.name;
    document.getElementById('serviceAddress').textContent = '📍 ' + svc.address;

    // Info tiles
    const grid = document.getElementById('serviceInfoGrid');
    grid.innerHTML = `
      <div class="info-tile glass-card">
        <div class="tile-icon">⭐</div>
        <div class="tile-value">${svc.rating}</div>
        <div class="tile-label">Рейтинг</div>
      </div>
      <div class="info-tile glass-card">
        <div class="tile-icon">💬</div>
        <div class="tile-value">${svc.reviews}</div>
        <div class="tile-label">Отзывов</div>
      </div>
      <div class="info-tile glass-card">
        <div class="tile-icon">🕐</div>
        <div class="tile-value" style="font-size:1rem">${svc.hours}</div>
        <div class="tile-label">Часы работы</div>
      </div>
      <div class="info-tile glass-card">
        <div class="tile-icon">🔧</div>
        <div class="tile-value" style="font-size:0.9rem">${svc.description}</div>
        <div class="tile-label">Описание</div>
      </div>
    `;

    // Price table
    this.renderServicePriceTable();

    if (pushHistory) {
      this.history.push(this.currentScreen);
    }
    this.showScreen('service');
  },

  renderServicePriceTable() {
    const tbody = document.getElementById('servicePriceBody');
    const prices = this.getPrices();
    tbody.innerHTML = '';
    for (const [size, p] of Object.entries(prices)) {
      const total = p.removal + p.balance;
      const label = size.replace('-', '–');
      tbody.innerHTML += `
        <tr>
          <td>${label}</td>
          <td>${p.removal.toLocaleString('ru')} ₽</td>
          <td>${p.balance.toLocaleString('ru')} ₽</td>
          <td><strong>${total.toLocaleString('ru')} ₽</strong></td>
        </tr>
      `;
    }
  },

  // ── CALENDAR ──
  calendarPrev() {
    this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
    this.renderCalendar();
  },

  calendarNext() {
    this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
    this.renderCalendar();
  },

  renderCalendar() {
    const now = new Date();
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();

    // Title
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    document.getElementById('calendarTitle').textContent = `${months[month]} ${year}`;

    // Disable prev if current month
    const prevBtn = document.getElementById('calPrevBtn');
    if (year === now.getFullYear() && month === now.getMonth()) {
      prevBtn.style.opacity = '0.3';
      prevBtn.style.pointerEvents = 'none';
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.pointerEvents = 'auto';
    }

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // Day names (Mon first)
    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    dayNames.forEach(d => {
      const el = document.createElement('div');
      el.className = 'day-name';
      el.textContent = d;
      grid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay(); // 0=Sun
    startDay = startDay === 0 ? 6 : startDay - 1; // Mon=0

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const schedule = this.getSchedule();
    const bookings = this.getBookings();

    // Empty cells
    for (let i = 0; i < startDay; i++) {
      const el = document.createElement('div');
      el.className = 'day-cell empty';
      grid.appendChild(el);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const el = document.createElement('div');
      el.className = 'day-cell';

      const isToday = date.toDateString() === now.toDateString();
      const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = date.getDay();
      const isDayOff = schedule.daysOff.includes(dayOfWeek);

      // Count bookings for this date
      const dateKey = this.dateKey(date);
      const dayBookings = bookings.filter(b => b.date === dateKey);
      const totalSlots = this.getSlotsForDate(date).length;
      const isFull = dayBookings.length >= totalSlots && totalSlots > 0;

      if (isPast) {
        el.classList.add('past');
      } else if (isDayOff) {
        el.classList.add('blocked');
      } else if (isFull) {
        el.classList.add('blocked');
      } else {
        el.classList.add('available');
        el.addEventListener('click', () => this.selectDate(date, day));
      }

      if (isToday) el.classList.add('today');

      if (this.selectedDate && date.toDateString() === this.selectedDate.toDateString()) {
        el.classList.add('selected');
      }

      el.textContent = day;
      grid.appendChild(el);
    }
  },

  selectDate(date, day) {
    this.selectedDate = date;
    this.selectedTime = null;
    this.renderCalendar();
    this.renderTimeSlots(date);
  },

  getSlotsForDate(date) {
    const schedule = this.getSchedule();
    const slots = [];
    for (let h = schedule.startHour; h < schedule.endHour; h++) {
      if (schedule.slotMinutes === 30) {
        slots.push(`${String(h).padStart(2, '0')}:00`);
        slots.push(`${String(h).padStart(2, '0')}:30`);
      } else {
        slots.push(`${String(h).padStart(2, '0')}:00`);
      }
    }
    return slots;
  },

  renderTimeSlots(date) {
    const panel = document.getElementById('timeSlotsPanel');
    const grid = document.getElementById('timeSlotsGrid');
    panel.classList.remove('hidden');

    const slots = this.getSlotsForDate(date);
    const dateKey = this.dateKey(date);
    const bookings = this.getBookings();
    const occupiedTimes = bookings.filter(b => b.date === dateKey).map(b => b.time);

    grid.innerHTML = '';
    slots.forEach(time => {
      const el = document.createElement('div');
      el.className = 'time-slot';
      el.textContent = time;

      if (occupiedTimes.includes(time)) {
        el.classList.add('occupied');
      } else {
        el.addEventListener('click', () => {
          grid.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
          el.classList.add('selected');
          this.selectedTime = time;
          document.getElementById('continueToFormBtn').disabled = false;
        });
      }

      if (this.selectedTime === time) {
        el.classList.add('selected');
      }

      grid.appendChild(el);
    });

    document.getElementById('continueToFormBtn').disabled = !this.selectedTime;

    // Scroll to time slots
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // ── BOOKING FORM ──
  updateBookingSummary() {
    const summary = document.getElementById('bookingSummary');
    if (!this.selectedService || !this.selectedDate || !this.selectedTime) return;

    const dateStr = this.selectedDate.toLocaleDateString('ru-RU', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

    summary.innerHTML = `
      <span class="badge">🛞 ${this.selectedService.name}</span>
      <span class="badge">📅 ${dateStr}</span>
      <span class="badge">🕐 ${this.selectedTime}</span>
    `;
  },

  selectWheels(count) {
    this.wheelCount = count;
    document.querySelectorAll('.wheel-option').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.count) === count);
    });
    this.updatePrice();
  },

  updatePrice() {
    // live update (optional preview)
  },

  goToInvoice() {
    const name = document.getElementById('inputName').value.trim();
    const phone = document.getElementById('inputPhone').value.trim();
    const size = document.getElementById('inputSize').value;

    if (!name || !phone || !size) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    this.bookingData = {
      name, phone, size,
      type: document.getElementById('inputType').value,
      wheels: this.wheelCount,
      serviceId: this.selectedService.id,
      serviceName: this.selectedService.name,
      date: this.dateKey(this.selectedDate),
      time: this.selectedTime,
      dateDisplay: this.selectedDate.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    };

    this.renderInvoice();
    this.navigate('invoice');
  },

  renderInvoice() {
    const bd = this.bookingData;
    const prices = this.getPrices();
    const p = prices[bd.size];
    const pricePerWheel = p.removal + p.balance;
    const total = pricePerWheel * bd.wheels;
    const advance = Math.ceil(total / 2);

    this.bookingData.total = total;
    this.bookingData.advance = advance;
    this.bookingData.pricePerWheel = pricePerWheel;

    const types = { winter: 'Зимние', summer: 'Летние', allseason: 'Всесезонные' };
    const sizeLabel = bd.size.replace('-', '–');

    const details = document.getElementById('invoiceDetails');
    details.innerHTML = `
      <div class="invoice-row">
        <span class="label">Шиномонтаж</span>
        <span class="value">${bd.serviceName}</span>
      </div>
      <div class="invoice-row">
        <span class="label">Дата и время</span>
        <span class="value">${bd.dateDisplay}, ${bd.time}</span>
      </div>
      <div class="invoice-row">
        <span class="label">Клиент</span>
        <span class="value">${bd.name}</span>
      </div>
      <div class="invoice-row">
        <span class="label">Телефон</span>
        <span class="value">${bd.phone}</span>
      </div>
      <div class="invoice-row">
        <span class="label">Размер шин</span>
        <span class="value">${sizeLabel}</span>
      </div>
      <div class="invoice-row">
        <span class="label">Тип</span>
        <span class="value">${types[bd.type]}</span>
      </div>
      <div class="invoice-row">
        <span class="label">Количество колёс</span>
        <span class="value">${bd.wheels} шт.</span>
      </div>
      <div class="invoice-row">
        <span class="label">Цена за колесо</span>
        <span class="value">${pricePerWheel.toLocaleString('ru')} ₽</span>
      </div>
    `;

    document.getElementById('invoiceTotal').textContent = total.toLocaleString('ru') + ' ₽';
    document.getElementById('invoiceAdvance').textContent = advance.toLocaleString('ru') + ' ₽';
  },

  confirmPayment() {
    // Save booking
    const bd = this.bookingData;
    const booking = {
      id: Date.now(),
      serviceId: bd.serviceId,
      serviceName: bd.serviceName,
      date: bd.date,
      time: bd.time,
      dateDisplay: bd.dateDisplay,
      name: bd.name,
      phone: bd.phone,
      size: bd.size,
      type: bd.type,
      wheels: bd.wheels,
      total: bd.total,
      advance: bd.advance,
      paidAdvance: true,
      createdAt: new Date().toISOString()
    };

    const bookings = this.getBookings();
    bookings.push(booking);
    localStorage.setItem('tire_bookings', JSON.stringify(bookings));

    // Render confirmation
    this.renderConfirmation(booking);
    this.navigate('confirm');

    // Reset form
    this.selectedDate = null;
    this.selectedTime = null;
    this.wheelCount = 4;
    document.getElementById('inputName').value = '';
    document.getElementById('inputPhone').value = '';
    document.getElementById('inputSize').value = '';
  },

  renderConfirmation(booking) {
    const types = { winter: 'Зимние', summer: 'Летние', allseason: 'Всесезонные' };
    const details = document.getElementById('confirmDetails');
    details.innerHTML = `
      <div class="detail-row">
        <span class="label">Шиномонтаж</span>
        <span>${booking.serviceName}</span>
      </div>
      <div class="detail-row">
        <span class="label">Дата</span>
        <span>${booking.dateDisplay}</span>
      </div>
      <div class="detail-row">
        <span class="label">Время</span>
        <span>${booking.time}</span>
      </div>
      <div class="detail-row">
        <span class="label">Шины</span>
        <span>${booking.size.replace('-', '–')} · ${types[booking.type]}</span>
      </div>
      <div class="detail-row">
        <span class="label">Колёса</span>
        <span>${booking.wheels} шт.</span>
      </div>
      <div class="detail-row">
        <span class="label">Итого</span>
        <span>${booking.total.toLocaleString('ru')} ₽</span>
      </div>
      <div class="detail-row">
        <span class="label">Предоплата (оплачена)</span>
        <span style="color:var(--success)">${booking.advance.toLocaleString('ru')} ₽ ✓</span>
      </div>
    `;
  },

  // ── PRICES (localStorage) ──
  getPrices() {
    const stored = localStorage.getItem('tire_prices');
    return stored ? JSON.parse(stored) : { ...this.defaultPrices };
  },

  loadPrices() {
    if (!localStorage.getItem('tire_prices')) {
      localStorage.setItem('tire_prices', JSON.stringify(this.defaultPrices));
    }
  },

  // ── SCHEDULE (localStorage) ──
  getSchedule() {
    const stored = localStorage.getItem('tire_schedule');
    return stored ? JSON.parse(stored) : { ...this.defaultSchedule };
  },

  loadSchedule() {
    if (!localStorage.getItem('tire_schedule')) {
      localStorage.setItem('tire_schedule', JSON.stringify(this.defaultSchedule));
    }
  },

  // ── BOOKINGS (localStorage) ──
  getBookings() {
    const stored = localStorage.getItem('tire_bookings');
    return stored ? JSON.parse(stored) : [];
  },

  dateKey(date) {
    return date.toISOString().split('T')[0];
  },

  // ── ADMIN ──
  isAdminLoggedIn() {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  },

  adminLogin() {
    const login = document.getElementById('adminLogin').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    if (login === 'admin' && password === 'admin123') {
      sessionStorage.setItem('admin_logged_in', 'true');
      document.getElementById('loginError').style.display = 'none';
      // Показываем панель напрямую, без перенавигации — избегаем гонки хэша
      this.showScreen('admin');
      this.renderAdmin();
      history.replaceState(null, '', location.pathname + '#admin');
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  },

  adminLogout() {
    sessionStorage.removeItem('admin_logged_in');
    this.navigate('map');
  },

  renderAdmin() {
    this.renderAdminStats();
    this.renderAdminBookings();
    this.renderAdminPricing();
    this.renderAdminSchedule();
    this.renderAdminLocations();
  },

  renderAdminStats() {
    const bookings = this.getBookings();
    const today = this.dateKey(new Date());
    const todayBookings = bookings.filter(b => b.date === today);
    const upcoming = bookings.filter(b => b.date >= today);
    const totalRevenue = bookings.reduce((sum, b) => sum + b.total, 0);
    const paidAdvances = bookings.filter(b => b.paidAdvance).reduce((sum, b) => sum + b.advance, 0);

    document.getElementById('adminStats').innerHTML = `
      <div class="stat-card glass-card">
        <div class="stat-icon">📅</div>
        <div class="stat-value">${todayBookings.length}</div>
        <div class="stat-label">Записей сегодня</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${upcoming.length}</div>
        <div class="stat-label">Предстоящих</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">${totalRevenue.toLocaleString('ru')} ₽</div>
        <div class="stat-label">Общая выручка</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${paidAdvances.toLocaleString('ru')} ₽</div>
        <div class="stat-label">Получено авансов</div>
      </div>
    `;
  },

  renderAdminBookings() {
    const bookings = this.getBookings();
    const tbody = document.getElementById('adminBookingsBody');

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:32px">Записей пока нет</td></tr>';
      return;
    }

    tbody.innerHTML = bookings.sort((a, b) => b.id - a.id).map(b => {
      const sizeLabel = b.size.replace('-', '–');
      return `
        <tr>
          <td>${b.dateDisplay || b.date}</td>
          <td>${b.time}</td>
          <td>${b.name}</td>
          <td>${b.phone}</td>
          <td>${sizeLabel}</td>
          <td>${b.wheels}</td>
          <td>${b.total.toLocaleString('ru')} ₽</td>
          <td>
            <span class="status-badge ${b.paidAdvance ? 'paid' : 'pending'}">
              ${b.paidAdvance ? 'Оплачен' : 'Ожидает'}
            </span>
          </td>
          <td>
            ${!b.paidAdvance ? `<button class="btn btn-sm btn-success" onclick="app.markPaid(${b.id})">Отметить</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  markPaid(id) {
    const bookings = this.getBookings();
    const booking = bookings.find(b => b.id === id);
    if (booking) {
      booking.paidAdvance = true;
      localStorage.setItem('tire_bookings', JSON.stringify(bookings));
      this.renderAdmin();
    }
  },

  renderAdminPricing() {
    const prices = this.getPrices();
    const tbody = document.getElementById('adminPriceBody');
    tbody.innerHTML = '';

    for (const [size, p] of Object.entries(prices)) {
      const label = size.replace('-', '–');
      const total = p.removal + p.balance;
      tbody.innerHTML += `
        <tr>
          <td>${label}</td>
          <td><input class="admin-price-input" type="number" data-size="${size}" data-field="removal" value="${p.removal}"></td>
          <td><input class="admin-price-input" type="number" data-size="${size}" data-field="balance" value="${p.balance}"></td>
          <td><strong>${total.toLocaleString('ru')} ₽</strong></td>
        </tr>
      `;
    }
  },

  savePrices() {
    const prices = this.getPrices();
    document.querySelectorAll('.admin-price-input').forEach(input => {
      const size = input.dataset.size;
      const field = input.dataset.field;
      prices[size][field] = parseInt(input.value) || 0;
    });
    localStorage.setItem('tire_prices', JSON.stringify(prices));
    this.renderAdminPricing();
    this.renderServicePriceTable();
    alert('Прайс-лист сохранён!');
  },

  renderAdminSchedule() {
    const schedule = this.getSchedule();
    document.getElementById('scheduleStart').value = schedule.startHour;
    document.getElementById('scheduleEnd').value = schedule.endHour;
    document.getElementById('scheduleSlot').value = schedule.slotMinutes;

    // Days off checkboxes
    for (let i = 0; i < 7; i++) {
      document.getElementById('dayOff' + i).checked = schedule.daysOff.includes(i);
    }
  },

  saveSchedule() {
    const schedule = {
      startHour: parseInt(document.getElementById('scheduleStart').value),
      endHour: parseInt(document.getElementById('scheduleEnd').value),
      slotMinutes: parseInt(document.getElementById('scheduleSlot').value),
      daysOff: []
    };

    for (let i = 0; i < 7; i++) {
      if (document.getElementById('dayOff' + i).checked) {
        schedule.daysOff.push(i);
      }
    }

    localStorage.setItem('tire_schedule', JSON.stringify(schedule));
  },

  renderAdminLocations() {
    const list = document.getElementById('adminLocationsList');
    list.innerHTML = this.services.map(svc => `
      <div class="glass-card" style="margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; padding:16px 20px">
        <div>
          <strong>${svc.name}</strong>
          <br><span style="font-size:0.85rem; color:var(--text-secondary)">${svc.address}</span>
        </div>
        <div style="text-align:right">
          <span style="color:#f59e0b">★ ${svc.rating}</span>
          <br><span style="font-size:0.8rem; color:var(--text-muted)">${svc.reviews} отзывов</span>
        </div>
      </div>
    `).join('');
  },

  switchAdminTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.admin-tab[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('tab-' + tabName).classList.remove('hidden');
  }
};

// ── Screen transition hooks ──
const origNavigate = app.navigate.bind(app);
app.navigate = function (screen, pushHistory = true) {
  origNavigate(screen, pushHistory);

  // Hook: when entering calendar, render it
  if (screen === 'calendar') {
    this.calendarDate = new Date();
    this.selectedDate = null;
    this.selectedTime = null;
    document.getElementById('timeSlotsPanel').classList.add('hidden');
    this.renderCalendar();
  }

  // Hook: when entering form, update summary
  if (screen === 'form') {
    this.updateBookingSummary();
    // Reset wheel selector
    this.wheelCount = 4;
    document.querySelectorAll('.wheel-option').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.count) === 4);
    });
  }
};

// ── Phone mask ──
document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('inputPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function (e) {
      let val = this.value.replace(/\D/g, '');
      if (val.length > 0) {
        if (val[0] === '8') val = '7' + val.slice(1);
        if (val[0] !== '7') val = '7' + val;
      }
      let formatted = '';
      if (val.length > 0) formatted = '+' + val[0];
      if (val.length > 1) formatted += ' (' + val.slice(1, 4);
      if (val.length > 4) formatted += ') ' + val.slice(4, 7);
      if (val.length > 7) formatted += '-' + val.slice(7, 9);
      if (val.length > 9) formatted += '-' + val.slice(9, 11);
      this.value = formatted;
    });
  }
});

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => app.init());
