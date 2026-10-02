import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import FocusTimer from './pages/FocusTimer'
import Journal from './pages/Journal'
import HabitTracker from './pages/HabitTracker'
import Dashboard from './pages/Dashboard'
import CalendarPage from './pages/Calendar'
import IdeasWall from './pages/Ideas'
import ShoppingPage from './pages/Shopping'
import PickMeUp from './pages/PickMeUp'
import WheelPage from './pages/Wheel'
import NinetyTwoClub from './pages/NinetyTwoClub'
import CoachingPage from './pages/Coaching'
import MyProjectsPage from './pages/MyProjects'
import HouseRenoPage from './pages/HouseReno'
import FinancePage from './pages/Finance'
import PlayStationPage from './pages/PlayStation'
import F1SimPage from './pages/F1Sim'
import FitnessPage from './pages/Fitness'
import WorkoutGuidePage from './pages/WorkoutGuide'
import QuizPage from './pages/Quiz'
import F1ModelsPage from './pages/F1Models'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'

export default function App() {
  const { theme, toggle } = useTheme()
  const [page, setPage] = useState('landing')

  const [events, setEvents] = useLocalStorage('danos-events', [])
  const [ideas, setIdeas] = useLocalStorage('danos-ideas', [])
  const [shoppingLists, setShoppingLists] = useLocalStorage('danos-shopping', [])
  const [pickmeups, setPickmeups] = useLocalStorage('danos-pickmeups', [])
  const [wheelData, setWheelData] = useLocalStorage('danos-wheel', {})
  const [clubData, setClubData] = useLocalStorage('danos-92club', {})
  const [coachingData, setCoachingData] = useLocalStorage('danos-coaching', {})
  const [projects, setProjects] = useLocalStorage('danos-projects', [])
  const [renoData, setRenoData] = useLocalStorage('danos-reno', {})
  const [psData, setPsData] = useLocalStorage('danos-ps', {})
  const [financeData, setFinanceData] = useLocalStorage('danos-finance', {})
  const [dashConfig, setDashConfig] = useLocalStorage('danos-dashboard-config', {})
  const [pantryItems, setPantryItems] = useLocalStorage('danos-pantry', [])
  const [modelsData, setModelsData] = useLocalStorage('danos-f1models', {})
  const [f1Data, setF1Data] = useLocalStorage('danos-f1sim', {})
  const [fitnessData, setFitnessData] = useLocalStorage('danos-fitness', {})
  const [landingConfig, setLandingConfig] = useLocalStorage('danos-landing-config', {
    osName: 'DanOS',
    greeting: 'Welcome back, Dan',
    subtitle: 'What are we doing today?',
    pinnedModules: ['dashboard','calendar','ideas','shopping','pickmeup','wheel','92club','coaching','projects','reno','f1sim','fitness','workout','focus','journal','habits','quiz','finance','playstation','models'],
    showQuote: true,
  })

  if (page === 'landing') {
    return (
      <Landing
        config={landingConfig} setConfig={setLandingConfig}
        onNavigate={setPage} theme={theme} onToggleTheme={toggle}
        pickmeups={pickmeups} events={events}
        shoppingLists={shoppingLists} ideas={ideas}
      />
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar active={page} onNavigate={setPage} theme={theme} onToggleTheme={toggle} profilePic={landingConfig.profilePic} osName={landingConfig.osName||'DanOS'} />
      <main className="main-content">
        {page === 'dashboard'  && <Dashboard events={events} ideas={ideas} shoppingLists={shoppingLists} pickmeups={pickmeups} clubData={clubData} f1Data={f1Data} fitnessData={fitnessData} financeData={financeData} dashConfig={dashConfig} setDashConfig={setDashConfig} onNavigate={setPage} />}
        {page === 'calendar'   && <CalendarPage events={events} setEvents={setEvents} />}
        {page === 'ideas'      && <IdeasWall ideas={ideas} setIdeas={setIdeas} />}
        {page === 'shopping'   && <ShoppingPage shoppingLists={shoppingLists} setShoppingLists={setShoppingLists} pantryItems={pantryItems} setPantryItems={setPantryItems} />}
        {page === 'pickmeup'   && <PickMeUp pickmeups={pickmeups} setPickmeups={setPickmeups} />}
        {page === 'wheel'      && <WheelPage wheelData={wheelData} setWheelData={setWheelData} onNavigate={setPage} />}
        {page === '92club'     && <NinetyTwoClub clubData={clubData} setClubData={setClubData} />}
        {page === 'coaching'   && <CoachingPage coachingData={coachingData} setCoachingData={setCoachingData} />}
        {page === 'projects'   && <MyProjectsPage projects={projects} setProjects={setProjects} />}
        {page === 'reno'       && <HouseRenoPage renoData={renoData} setRenoData={setRenoData} />}
        {page === 'finance'    && <FinancePage financeData={financeData} setFinanceData={setFinanceData} />}
        {page === 'playstation'&& <PlayStationPage psData={psData} setPsData={setPsData} />}
        {page === 'f1sim'      && <F1SimPage f1Data={f1Data} setF1Data={setF1Data} />}
        {page === 'fitness'    && <FitnessPage fitnessData={fitnessData} setFitnessData={setFitnessData} />}
        {page === 'workout'    && <WorkoutGuidePage />}
        {page === 'quiz'       && <QuizPage />}
        {page === 'focus'      && <FocusTimer />}
        {page === 'journal'    && <Journal />}
        {page === 'habits'     && <HabitTracker />}
        {page === 'models'     && <F1ModelsPage modelsData={modelsData} setModelsData={setModelsData} />}
      </main>
    </div>
  )
}
