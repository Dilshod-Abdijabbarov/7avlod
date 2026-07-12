import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FamilyService, Person } from '../services/family.service';
import { NgxEchartsModule } from 'ngx-echarts';

@Component({
  selector: 'app-family-tree',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  templateUrl: './family-tree.component.html',
  styleUrls: ['./family-tree.component.css']
})
export class FamilyTreeComponent implements OnInit {
  private familyService = inject(FamilyService);
  
  // ECharts uchun kerakli options
  chartOptions = signal<any>(null);
  
  selectedPerson: Person | null = null;
  selectedPersonSpouses: Person[] = [];
  isLoading = signal<boolean>(true);
  loadedTreeData: any = null;

  async ngOnInit() {
    this.isLoading.set(true);
    
    try {
      // Shajara ko'rinishida barcha shaxslarni va nikohlarni cheklovsiz olish (spouses chiqishi uchun)
      this.familyService.personsPageSize.set(10000);
      this.familyService.spousesPageSize.set(10000);
      await this.familyService.refreshPersons();
      await this.familyService.refreshSpouses();
    } catch (e) {
      console.error('Shaxslar va nikohlarni to\'liq yuklashda xato:', e);
    }
    
    // User so'ragan maxsus ID bo'yicha ma'lumotni olamiz
    const personId = 'f1c6d739-48e9-4f5b-952a-d9af5b7e6c31';
    const treeData = await this.familyService.getEchartsTreeById(personId);
    
    if (treeData) {
      this.loadedTreeData = treeData;
      this.initChart(treeData);
    }
    this.isLoading.set(false);
  }

  initChart(data: any) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    this.chartOptions.set({
      tooltip: {
        show: false
      },
      series: [
        {
          type: 'tree',
          data: [data],
          roam: true,
          left: isMobile ? '8%' : '5%',
          right: isMobile ? '12%' : '5%',
          top: '8%',
          bottom: isMobile ? '8%' : '15%',
          zoom: isMobile ? 1.4 : 1.0,
          symbolSize: 12,
          symbol: 'emptyCircle',
          orient: isMobile ? 'horizontal' : 'vertical',
          expandAndCollapse: true,
          label: {
            position: isMobile ? 'left' : 'top',
            verticalAlign: 'middle',
            align: isMobile ? 'right' : 'center',
            fontSize: 13,
            distance: 8,
            color: '#fff',
            textBorderColor: '#000',
            textBorderWidth: 2
          },
          leaves: {
            label: {
              position: isMobile ? 'right' : 'bottom',
              verticalAlign: 'middle',
              align: isMobile ? 'left' : 'center',
              distance: 8
            }
          },
          animationDurationUpdate: 750,
          lineStyle: {
            color: '#7b9ce6',
            width: 2,
            curveness: 0.5
          },
          itemStyle: {
            color: '#ffffff',
            borderColor: '#7b9ce6',
            borderWidth: 2
          }
        }
      ]
    });
  }

  onChartInit(chart: any) {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    let lastFontSize = isMobile ? 10 : 13;
    chart.on('roam', (params: any) => {
      if (params.zoom !== undefined) {
        const opt = chart.getOption();
        const currentZoom = opt.series[0].zoom || (isMobile ? 1.4 : 1.0);
        const baseSize = isMobile ? 10 : 13;
        const relativeZoom = currentZoom / (isMobile ? 1.4 : 1.0);
        let newFontSize = Math.round(baseSize * relativeZoom);
        if (newFontSize < 8) newFontSize = 8;
        if (newFontSize > 22) newFontSize = 22;

        if (newFontSize !== lastFontSize) {
          lastFontSize = newFontSize;
          chart.setOption({
            series: [{
              label: {
                fontSize: newFontSize
              }
            }]
          });
        }
      }
    });
  }

  onChartClick(event: any) {
    if (event.data && event.data.originalData) {
      const basicData = event.data.originalData;
      // To'liq ma'lumotlarni persons ro'yxatidan qidiramiz
      const fullPerson = this.familyService.persons().find(p => p.id === basicData.id) || basicData;
      this.selectPerson(fullPerson);
    }
  }

  selectPerson(person: Person) {
    this.selectedPerson = person;
    
    // Turmush o'rtog'ini (xotini/eri) topish
    this.selectedPersonSpouses = [];
    const spouses = this.familyService.spouses();
    const allPersons = this.familyService.persons();
    
    const marriages = spouses.filter(s => s.husbandId === person.id || s.wifeId === person.id);
    for (const m of marriages) {
      const spouseId = m.husbandId === person.id ? m.wifeId : m.husbandId;
      const spouseObj = allPersons.find(p => p.id === spouseId);
      if (spouseObj) {
        this.selectedPersonSpouses.push(spouseObj);
      }
    }
  }

  closeModal() {
    this.selectedPerson = null;
    this.selectedPersonSpouses = [];
  }

  downloadTreeAsHtml() {
    if (!this.loadedTreeData) return;
    
    // Copy the tree data to avoid mutating original
    const treeCopy = JSON.parse(JSON.stringify(this.loadedTreeData));
    
    const spouses = this.familyService.spouses();
    const allPersons = this.familyService.persons();
    
    // Generate stand-alone html string
    const htmlContent = this.generateStandaloneHtml(treeCopy, allPersons, spouses);
    
    // Download file
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const filename = `${treeCopy.name || 'shajara'}_sulolasi.html`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  generateStandaloneHtml(treeData: any, allPersons: any[], marriages: any[]): string {
    const serializedData = JSON.stringify(treeData);
    const serializedPersons = JSON.stringify(allPersons);
    const serializedMarriages = JSON.stringify(marriages);
    
    return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${treeData.name || 'Shajara'} - Sulola Shajarasi</title>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- ECharts Library -->
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
  
  <style>
    :root {
      --bg-color: #0f0f16;
      --panel-bg: rgba(20, 20, 30, 0.6);
      --glass-border: rgba(255, 255, 255, 0.08);
      --text-color: #ffffff;
      --accent-color: #00ffc8;
      --spouse-color: #ff4081;
      --bg-gradient: radial-gradient(at 0% 0%, rgba(0, 255, 200, 0.05) 0px, transparent 50%),
                     radial-gradient(at 100% 100%, rgba(255, 64, 129, 0.05) 0px, transparent 50%);
    }

    [data-theme='light'] {
      --bg-color: #f5f7fa;
      --panel-bg: rgba(255, 255, 255, 0.85);
      --glass-border: rgba(0, 0, 0, 0.08);
      --text-color: #2c3e50;
      --accent-color: #3498db;
      --spouse-color: #e1306c;
      --bg-gradient: radial-gradient(at 0% 0%, rgba(52, 152, 219, 0.05) 0px, transparent 50%),
                     radial-gradient(at 100% 100%, rgba(225, 48, 108, 0.05) 0px, transparent 50%);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-color);
      background-image: var(--bg-gradient);
      color: var(--text-color);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: background 0.3s, color 0.3s;
    }

    header {
      padding: 20px 40px;
      background: rgba(10, 10, 15, 0.5);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--glass-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      transition: all 0.3s ease;
    }

    header h1 {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--text-color);
    }

    .badge {
      background: rgba(0, 255, 200, 0.1);
      color: var(--accent-color);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid rgba(0, 255, 200, 0.2);
    }

    .main-container {
      flex: 1;
      display: flex;
      position: relative;
      height: calc(100vh - 65px);
    }

    #chart-container {
      flex: 1;
      height: calc(100vh - 65px);
      min-height: 500px;
      width: 100%;
    }

    /* Modal / Sidebar Panel */
    .detail-panel {
      position: fixed;
      top: 0;
      right: -420px;
      width: 400px;
      height: 100vh;
      background: var(--panel-bg);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-left: 1px solid var(--glass-border);
      box-shadow: -10px 0 40px rgba(0,0,0,0.6);
      transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 100;
      padding: 40px 30px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      color: var(--text-color);
    }

    @media (max-width: 600px) {
      .detail-panel {
        width: 100% !important;
        right: -100% !important;
        padding: 30px 20px;
      }
      .detail-panel.open {
        right: 0 !important;
      }
    }

    .detail-panel.open {
      right: 0;
    }

    .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.05);
      border: none;
      color: white;
      font-size: 22px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: rgba(255, 64, 129, 0.8);
      transform: rotate(90deg);
    }

    .panel-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 30px;
      text-align: center;
    }

    .avatar-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      margin-bottom: 15px;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid var(--accent-color);
      box-shadow: 0 0 25px rgba(0, 255, 200, 0.4);
    }

    .panel-header h2 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 5px;
    }

    .panel-role {
      font-size: 13px;
      color: var(--accent-color);
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }

    .panel-body {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 15px;
    }

    .info-icon {
      font-size: 20px;
      line-height: 1;
    }

    .info-content {
      font-size: 15px;
      color: var(--text-color);
      font-weight: 500;
    }

    .info-content strong {
      display: block;
      font-size: 11px;
      color: #92a4bd;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.8px;
      font-weight: 700;
    }

    [data-theme='light'] .info-content strong {
      color: #5d6d7e;
    }

    .bio-text {
      font-style: normal;
      color: var(--text-color);
      border-left: 3px solid var(--accent-color);
      padding-left: 12px;
      margin-top: 6px;
      line-height: 1.6;
    }

    .spouse-section {
      border-top: 1px dashed var(--glass-border);
      padding-top: 20px;
      margin-top: 10px;
    }

    .spouse-title {
      font-size: 11px;
      color: #92a4bd;
      text-transform: uppercase;
      margin-bottom: 12px;
      letter-spacing: 0.8px;
      font-weight: 700;
    }

    [data-theme='light'] .spouse-title {
      color: #5d6d7e;
    }

    .spouse-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .spouse-item {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 64, 129, 0.08);
      padding: 10px 15px;
      border-radius: 8px;
      border: 1px solid rgba(255, 64, 129, 0.2);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .spouse-item:hover {
      background: rgba(255, 64, 129, 0.15);
      transform: translateX(5px);
    }

    .spouse-avatar {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--spouse-color);
    }

    .spouse-name {
      font-size: 14px;
      font-weight: 500;
    }

    .social-link {
      display: inline-block;
      margin-right: 10px;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 13px;
      text-decoration: none;
      color: white;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
    }

    .social-link:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .social-link.tg {
      color: #3390ec;
      border-color: rgba(51, 144, 236, 0.3);
    }

    .social-link.ig {
      color: #e1306c;
      border-color: rgba(225, 48, 108, 0.3);
    }

    .controls {
      position: absolute;
      bottom: 30px;
      left: 30px;
      display: flex;
      gap: 10px;
      z-index: 10;
    }

    .btn-ctrl {
      background: rgba(20, 20, 30, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      color: white;
      width: 44px;
      height: 44px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }

    .btn-ctrl:hover {
      background: var(--accent-color);
      color: black;
      border-color: var(--accent-color);
      box-shadow: 0 0 15px rgba(0, 255, 200, 0.4);
    }

    .search-box {
      position: absolute;
      top: 20px;
      left: 30px;
      z-index: 10;
      width: 300px;
    }

    .search-input {
      width: 100%;
      padding: 12px 15px;
      background: rgba(20, 20, 30, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      border-radius: 10px;
      color: white;
      font-size: 14px;
      outline: none;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: all 0.3s;
    }

    .search-input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 15px rgba(0, 255, 200, 0.3);
    }

    /* Helper notification */
    .helper-tip {
      position: absolute;
      bottom: 30px;
      right: 30px;
      background: rgba(20, 20, 30, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid var(--glass-border);
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 12px;
      opacity: 0.7;
      pointer-events: none;
    }

    .btn-theme {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--glass-border);
      color: var(--text-color);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s ease;
    }

    .btn-theme:hover {
      background: var(--accent-color);
      color: black;
      border-color: var(--accent-color);
      box-shadow: 0 0 10px rgba(0, 255, 200, 0.3);
    }
  </style>
</head>
<body>

  <header>
    <h1>${treeData.name || 'Shajara'} - Sulola Shajarasi</h1>
    <div style="display: flex; align-items: center; gap: 15px;">
      <button onclick="toggleTheme()" class="btn-theme" id="theme-toggle-btn" title="Mavzuni o'zgartirish">
        ☀️ Light Mode
      </button>
      <span class="badge">Offline Shajara</span>
    </div>
  </header>

  <div class="main-container">
    <!-- ECharts daraxti -->
    <div id="chart-container"></div>



    <div class="helper-tip">
      💡 Kattalashtirish uchun sichqoncha g'ildiragidan, surish uchun esa chap tugmasini bosib tortishdan foydalaning.
    </div>
  </div>

  <!-- Tafsilotlar paneli -->
  <div id="detail-panel" class="detail-panel">
    <button class="close-btn" onclick="closePanel()">×</button>
    <div class="panel-header">
      <div class="avatar-wrapper">
        <img id="p-avatar" class="avatar-img" src="" alt="avatar">
      </div>
      <h2 id="p-name">Familiya Ism</h2>
      <span id="p-role" class="panel-role">Erkak</span>
    </div>
    <div class="panel-body">
      <div class="info-row" id="row-dates">
        <div class="info-icon">📅</div>
        <div class="info-content">
          <strong>Hayot yillari</strong>
          <span id="p-dates">-</span>
        </div>
      </div>
      
      <div class="info-row" id="row-address">
        <div class="info-icon">📍</div>
        <div class="info-content">
          <strong>Manzil</strong>
          <span id="p-address">-</span>
        </div>
      </div>

      <div class="info-row" id="row-phone">
        <div class="info-icon">📞</div>
        <div class="info-content">
          <strong>Telefon raqami</strong>
          <span id="p-phone">-</span>
        </div>
      </div>

      <div class="info-row" id="row-socials">
        <div class="info-icon">🔗</div>
        <div class="info-content">
          <strong>Ijtimoiy tarmoqlar</strong>
          <div id="p-socials"></div>
        </div>
      </div>

      <div class="info-row" id="row-bio">
        <div class="info-icon">📝</div>
        <div class="info-content">
          <strong>Biografiya / Tarjimayi hol</strong>
          <p id="p-bio" class="bio-text">-</p>
        </div>
      </div>

      <div class="spouse-section" id="spouse-section">
        <h4 class="spouse-title">💍 Turmush o'rtog'i</h4>
        <div id="spouse-list" class="spouse-list"></div>
      </div>
    </div>
  </div>

  <script>
    // Embedded Tree Data
    const rawData = ${serializedData};
    const allPersonsList = ${serializedPersons};
    const marriagesList = ${serializedMarriages};
    let chart = null;

    // Helper: Barcha odamlarni linear ro'yxatga aylantirish (qidiruv uchun)
    const flatPersons = [];
    function flattenTree(node) {
      if (node.originalData) {
        flatPersons.push(node.originalData);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(flattenTree);
      }
    }
    flattenTree(rawData);

    // ECharts sozlash
    function initChart() {
      const container = document.getElementById('chart-container');
      chart = echarts.init(container);
      
      const isMobile = window.innerWidth < 768;
      
      const option = {
        tooltip: {
          show: false
        },
        series: [
          {
            type: 'tree',
            data: [rawData],
            roam: true,
            left: isMobile ? '8%' : '5%',
            right: isMobile ? '12%' : '5%',
            top: '8%',
            bottom: isMobile ? '8%' : '12%',
            zoom: isMobile ? 1.4 : 1.0,
            symbolSize: 14,
            symbol: 'emptyCircle',
            orient: isMobile ? 'horizontal' : 'vertical',
            expandAndCollapse: true,
            label: {
              position: isMobile ? 'left' : 'top',
              verticalAlign: 'middle',
              align: isMobile ? 'right' : 'center',
              fontSize: 13,
              distance: 8,
              color: '#ffffff',
              textBorderColor: '#0f0f16',
              textBorderWidth: 3
            },
            leaves: {
              label: {
                position: isMobile ? 'right' : 'bottom',
                verticalAlign: 'middle',
                align: isMobile ? 'left' : 'center',
                distance: 8
              }
            },
            lineStyle: {
              color: '#00ffc8',
              width: 1.5,
              curveness: 0.5
            },
            itemStyle: {
              color: '#ffffff',
              borderColor: '#00ffc8',
              borderWidth: 2
            },
            animationDuration: 550,
            animationDurationUpdate: 750
          }
        ]
      };

      chart.setOption(option);

      // Roam (zoom/pan) hodisasi yuz berganda matn hajmini dinamik o'zgartirish
      let lastFontSize = isMobile ? 10 : 13;
      chart.on('roam', function(params) {
        if (params.zoom !== undefined) {
          const opt = chart.getOption();
          const currentZoom = opt.series[0].zoom || (isMobile ? 1.4 : 1.0);
          const baseSize = isMobile ? 10 : 13;
          const relativeZoom = currentZoom / (isMobile ? 1.4 : 1.0);
          let newFontSize = Math.round(baseSize * relativeZoom);
          if (newFontSize < 8) newFontSize = 8;
          if (newFontSize > 22) newFontSize = 22;

          if (newFontSize !== lastFontSize) {
            lastFontSize = newFontSize;
            chart.setOption({
              series: [{
                label: {
                  fontSize: newFontSize
                }
              }]
            });
          }
        }
      });

      // Node bosilganda tafsilotlar oynasini ochish
      chart.on('click', function(params) {
        if (params.data && params.data.originalData) {
          showPersonDetails(params.data.originalData);
        }
      });
    }

    // Shaxs tafsilotlarini chiqarish
    function showPersonDetails(person) {
      document.getElementById('p-name').innerText = person.firstName + ' ' + (person.lastName || '');
      
      const roleText = person.role || (person.gender === 1 ? 'Erkak' : (person.gender === 2 ? 'Ayol' : 'Noma\\\'lum'));
      document.getElementById('p-role').innerText = roleText;
      
      // Rasm
      const avatarImg = document.getElementById('p-avatar');
      const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(person.firstName + '+' + (person.lastName || '')) + '&background=00ffc8&color=000&size=150';
      avatarImg.src = person.photoUrl || person.imageUrl || defaultAvatar;
      avatarImg.onerror = function() {
        this.src = defaultAvatar;
      };

      // Yillar
      if (person.birthDate || person.deathDate) {
        document.getElementById('row-dates').style.display = 'flex';
        const bDate = person.birthDate ? formatDate(person.birthDate) : '...';
        const dDate = person.isAlive ? 'Hozirgacha' : (person.deathDate ? formatDate(person.deathDate) : '...');
        document.getElementById('p-dates').innerText = bDate + ' - ' + dDate;
      } else {
        document.getElementById('row-dates').style.display = 'none';
      }

      // Manzil
      if (person.birthPlace || person.location) {
        document.getElementById('row-address').style.display = 'flex';
        document.getElementById('p-address').innerText = person.birthPlace || person.location;
      } else {
        document.getElementById('row-address').style.display = 'none';
      }

      // Telefon
      if (person.phoneNumber) {
        document.getElementById('row-phone').style.display = 'flex';
        document.getElementById('p-phone').innerText = person.phoneNumber;
      } else {
        document.getElementById('row-phone').style.display = 'none';
      }

      // Biografiya
      const bioText = person.description || person.biography || person.bio;
      if (bioText) {
        document.getElementById('row-bio').style.display = 'flex';
        document.getElementById('p-bio').innerText = bioText;
      } else {
        document.getElementById('row-bio').style.display = 'none';
      }

      // Ijtimoiy tarmoqlar
      const socialsDiv = document.getElementById('p-socials');
      socialsDiv.innerHTML = '';
      if (person.telegramLink || person.instagramLink) {
        document.getElementById('row-socials').style.display = 'flex';
        if (person.telegramLink) {
          socialsDiv.innerHTML += '<a href="' + person.telegramLink + '" target="_blank" class="social-link tg">Telegram</a>';
        }
        if (person.instagramLink) {
          socialsDiv.innerHTML += '<a href="' + person.instagramLink + '" target="_blank" class="social-link ig">Instagram</a>';
        }
      } else {
        document.getElementById('row-socials').style.display = 'none';
      }

      // Turmush o'rtog'i
      const spouseSection = document.getElementById('spouse-section');
      const spouseList = document.getElementById('spouse-list');
      spouseList.innerHTML = '';
      
      const marriages = marriagesList.filter(function(s) {
        return s.husbandId === person.id || s.wifeId === person.id;
      });
      const spousesFound = [];
      for (var i = 0; i < marriages.length; i++) {
        const m = marriages[i];
        const spouseId = m.husbandId === person.id ? m.wifeId : m.husbandId;
        const spouseObj = allPersonsList.find(function(p) { return p.id === spouseId; });
        if (spouseObj) {
          spousesFound.push(spouseObj);
        }
      }

      if (spousesFound.length > 0) {
        spouseSection.style.display = 'block';
        spousesFound.forEach(function(sp) {
          const spAvatar = sp.photoUrl || sp.imageUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sp.firstName + '+' + (sp.lastName || '')) + '&background=ff4081&color=fff&size=50';
          const item = document.createElement('div');
          item.className = 'spouse-item';
          item.innerHTML = '<img class="spouse-avatar" src="' + spAvatar + '" alt="spouse">' +
                           '<span class="spouse-name">' + sp.firstName + ' ' + (sp.lastName || '') + '</span>';
          
          item.onclick = function() {
            const fullSp = allPersonsList.find(function(p) { return p.id === sp.id; });
            if (fullSp) showPersonDetails(fullSp);
          };
          spouseList.appendChild(item);
        });
      } else {
        spouseSection.style.display = 'none';
      }

      // Panelni ochish
      document.getElementById('detail-panel').classList.add('open');
    }

    function closePanel() {
      document.getElementById('detail-panel').classList.remove('open');
    }

    function formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return day + '.' + month + '.' + year;
    }

    // Zoom & Pan boshqaruvi
    function zoomIn() {
      if (!chart) return;
      const option = chart.getOption();
      const zoom = option.series[0].zoom || 1;
      chart.setOption({
        series: [{
          zoom: zoom + 0.1
        }]
      });
    }

    function zoomOut() {
      if (!chart) return;
      const option = chart.getOption();
      const zoom = option.series[0].zoom || 1;
      if (zoom > 0.2) {
        chart.setOption({
          series: [{
            zoom: zoom - 0.1
          }]
        });
      }
    }

    function resetChart() {
      if (!chart) return;
      chart.setOption({
        series: [{
          zoom: 1,
          center: null
        }]
      });
    }

    function pan(direction) {
      if (!chart) return;
      const option = chart.getOption();
      const series = option.series[0];
      let currentCenter = series.center;
      
      let cx = 50;
      let cy = 50;
      
      if (currentCenter && Array.isArray(currentCenter)) {
        cx = parseFloat(currentCenter[0]);
        cy = parseFloat(currentCenter[1]);
        const isPercentX = typeof currentCenter[0] === 'string' && currentCenter[0].includes('%');
        const isPercentY = typeof currentCenter[1] === 'string' && currentCenter[1].includes('%');
        const unitX = isPercentX ? '%' : '';
        const unitY = isPercentY ? '%' : '';
        const step = isPercentX ? 10 : 100;
        
        if (direction === 'left') cx += step;
        if (direction === 'right') cx -= step;
        if (direction === 'up') cy += step;
        if (direction === 'down') cy -= step;
        
        chart.setOption({
          series: [{
            center: [cx + unitX, cy + unitY]
          }]
        });
      } else {
        const w = chart.getWidth();
        const h = chart.getHeight();
        cx = w / 2;
        cy = h / 2;
        const step = 100;
        
        if (direction === 'left') cx += step;
        if (direction === 'right') cx -= step;
        if (direction === 'up') cy += step;
        if (direction === 'down') cy -= step;
        
        chart.setOption({
          series: [{
            center: [cx, cy]
          }]
        });
      }
    }

    // Shaxsni qidirish
    function searchPerson() {
      const query = document.getElementById('search-person').value.trim().toLowerCase();
      if (!query) {
        resetHighlight();
        return;
      }

      const found = allPersonsList.find(p => 
        (p.firstName + ' ' + (p.lastName || '')).toLowerCase().includes(query) || 
        (p.pinfl && p.pinfl.includes(query))
      );

      if (found) {
        showPersonDetails(found);
        highlightNode(found.id);
      }
    }

    let currentTheme = 'dark';

    function toggleTheme() {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      
      const themeBtn = document.getElementById('theme-toggle-btn');
      if (currentTheme === 'light') {
        themeBtn.innerHTML = '🌙 Dark Mode';
      } else {
        themeBtn.innerHTML = '☀️ Light Mode';
      }
      
      updateChartTheme();
    }

    function updateChartTheme() {
      if (!chart) return;
      
      const isLight = currentTheme === 'light';
      const accentColor = isLight ? '#3498db' : '#00ffc8';
      const labelColor = isLight ? '#2c3e50' : '#ffffff';
      const borderColor = isLight ? '#ffffff' : '#0f0f16';
      
      chart.setOption({
        series: [
          {
            label: {
              color: labelColor,
              textBorderColor: borderColor
            },
            lineStyle: {
              color: accentColor
            },
            itemStyle: {
              color: '#ffffff',
              borderColor: accentColor
            }
          }
        ]
      });
    }

    function highlightNode(personId) {
      if (!chart) return;
      
      const modifiedData = JSON.parse(JSON.stringify(rawData));
      const accentColor = currentTheme === 'light' ? '#3498db' : '#00ffc8';
      const borderColor = currentTheme === 'light' ? '#000000' : '#ffffff';
      
      function traverseAndHighlight(node) {
        if (node.originalData && node.originalData.id === personId) {
          node.itemStyle = {
            color: accentColor,
            borderColor: borderColor,
            borderWidth: 4,
            shadowBlur: 20,
            shadowColor: accentColor
          };
          node.label = {
            fontSize: 16,
            fontWeight: 'bold',
            color: accentColor
          };
        } else {
          node.itemStyle = {
            opacity: 0.5
          };
          node.label = {
            opacity: 0.5
          };
        }
        if (node.children) {
          node.children.forEach(traverseAndHighlight);
        }
      }
      
      traverseAndHighlight(modifiedData);
      chart.setOption({
        series: [{
          data: [modifiedData]
        }]
      });
    }

    function resetHighlight() {
      if (!chart) return;
      chart.setOption({
        series: [{
          data: [rawData]
        }]
      });
    }

    // Sahifa yuklanganda ishga tushirish
    window.onload = function() {
      if (typeof echarts === 'undefined') {
        document.getElementById('chart-container').innerHTML = \`
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; background: rgba(255, 64, 129, 0.1); border: 1px solid #ff4081; padding: 30px; border-radius: 15px; max-width: 500px; z-index: 1000; backdrop-filter: blur(10px); box-sizing: border-box;">
            <h3 style="color: #ff4081; margin-bottom: 15px; font-size: 20px;">⚠️ Grafik yuklanmadi (Internet yo'q)</h3>
            <p style="font-size: 14px; opacity: 0.9; line-height: 1.6; margin-bottom: 20px; color: #fff;">
              Shajarani birinchi marta ochganda chizuvchi ECharts kutubxonasini yuklash uchun internet aloqasi talab qilinadi. Iltimos, internetga ulanib, sahifani qayta yuklang.
            </p>
            <button onclick="window.location.reload()" style="background: #ff4081; border: none; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s;">
              Qayta yuklash
            </button>
          </div>
        \`;
        return;
      }
      initChart();
      
      window.onresize = function() {
        if (chart) chart.resize();
      };
    };
  </script>
</body>
</html>`;
  }
}
