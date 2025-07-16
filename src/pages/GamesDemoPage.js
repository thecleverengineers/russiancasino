import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Table,
  Progress,
  Modal,
  ModalHeader,
  ModalBody,
  Alert,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
  Input,
  ButtonGroup
} from 'reactstrap';
import { 
  FaDragon, 
  FaTiger, 
  FaEquals, 
  FaSpade, 
  FaHeart, 
  FaDiamond, 
  FaClub,
  FaFire,
  FaCrown,
  FaDice,
  FaGem,
  FaPlay,
  FaPause
} from 'react-icons/fa';
import { 
  MdTimer, 
  MdTrendingUp, 
  MdLeaderboard, 
  MdHistory,
  MdCasino,
  MdSportsEsports,
  MdVerifiedUser
} from 'react-icons/md';

const GamesDemoPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [selectedGame, setSelectedGame] = useState('dragon-tiger');
  const [betAmount, setBetAmount] = useState(100);
  const [timeRemaining, setTimeRemaining] = useState(45000);
  const [currentPeriod, setCurrentPeriod] = useState(12345);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [demoRunning, setDemoRunning] = useState(true);

  // Mock data
  const balance = 5000.00;
  const gameTypes = [
    { 
      id: 'dragon-tiger', 
      name: 'Dragon vs Tiger', 
      icon: <FaDragon />, 
      color: 'danger',
      description: 'Classic card battle - Dragon vs Tiger',
      periods: [
        { id: '1', duration: '30s', players: 45, timeLeft: 25000, status: 'betting' },
        { id: '2', duration: '1m', players: 123, timeLeft: 45000, status: 'betting' },
        { id: '3', duration: '3m', players: 89, timeLeft: 125000, status: 'betting' },
        { id: '4', duration: '5m', players: 67, timeLeft: 245000, status: 'betting' }
      ]
    },
    { 
      id: 'lucky7', 
      name: 'Lucky 7', 
      icon: <FaGem />, 
      color: 'success',
      description: 'Two cards sum - Under, Lucky, or Over 7',
      periods: [
        { id: '5', duration: '30s', players: 34, timeLeft: 15000, status: 'betting' },
        { id: '6', duration: '1m', players: 78, timeLeft: 35000, status: 'betting' },
        { id: '7', duration: '3m', players: 56, timeLeft: 155000, status: 'betting' },
        { id: '8', duration: '5m', players: 43, timeLeft: 285000, status: 'betting' }
      ]
    },
    { 
      id: 'roulette', 
      name: 'Roulette', 
      icon: <FaDice />, 
      color: 'warning',
      description: 'European roulette with live spins',
      periods: [
        { id: '9', duration: '30s', players: 67, timeLeft: 20000, status: 'betting' },
        { id: '10', duration: '1m', players: 145, timeLeft: 50000, status: 'betting' },
        { id: '11', duration: '3m', players: 98, timeLeft: 170000, status: 'betting' },
        { id: '12', duration: '5m', players: 76, timeLeft: 290000, status: 'betting' }
      ]
    },
    { 
      id: 'blackjack', 
      name: 'Blackjack', 
      icon: <FaSpade />, 
      color: 'dark',
      description: 'Classic 21 with side bets',
      periods: [
        { id: '13', duration: '1m', players: 89, timeLeft: 40000, status: 'betting' },
        { id: '14', duration: '3m', players: 134, timeLeft: 160000, status: 'betting' },
        { id: '15', duration: '5m', players: 112, timeLeft: 270000, status: 'betting' }
      ]
    },
    { 
      id: 'live-blackjack', 
      name: 'Live Blackjack', 
      icon: <FaCrown />, 
      color: 'primary',
      description: 'Blackjack with AI dealers',
      periods: [
        { id: '16', duration: '1m', players: 156, timeLeft: 30000, status: 'betting' },
        { id: '17', duration: '3m', players: 203, timeLeft: 180000, status: 'betting' },
        { id: '18', duration: '5m', players: 187, timeLeft: 300000, status: 'betting' }
      ]
    }
  ];

  const mockHistory = [
    { periodNumber: 12344, result: { winner: 'dragon' }, endTime: new Date(Date.now() - 60000), playersCount: 89, totalBets: 15600 },
    { periodNumber: 12343, result: { winner: 'tiger' }, endTime: new Date(Date.now() - 120000), playersCount: 76, totalBets: 13400 },
    { periodNumber: 12342, result: { winner: 'dragon' }, endTime: new Date(Date.now() - 180000), playersCount: 92, totalBets: 17800 },
    { periodNumber: 12341, result: { winner: 'tie' }, endTime: new Date(Date.now() - 240000), playersCount: 67, totalBets: 12300 },
    { periodNumber: 12340, result: { winner: 'dragon' }, endTime: new Date(Date.now() - 300000), playersCount: 84, totalBets: 16900 },
    { periodNumber: 12339, result: { winner: 'dragon' }, endTime: new Date(Date.now() - 360000), playersCount: 78, totalBets: 14500 },
    { periodNumber: 12338, result: { winner: 'tiger' }, endTime: new Date(Date.now() - 420000), playersCount: 95, totalBets: 18700 },
    { periodNumber: 12337, result: { winner: 'dragon' }, endTime: new Date(Date.now() - 480000), playersCount: 73, totalBets: 13800 }
  ];

  const mockTrends = {
    distribution: {
      dragon: { count: 45, percentage: "45.0" },
      tiger: { count: 38, percentage: "38.0" },
      tie: { count: 17, percentage: "17.0" }
    },
    currentStreak: { type: 'dragon', count: 3 },
    longestStreak: { type: 'dragon', count: 6 },
    totalGames: 100
  };

  const mockUserStats = {
    gamesPlayed: 247,
    gamesWon: 134,
    winRate: 54.3,
    totalWinnings: 8765.50,
    profitLoss: 1234.75,
    currentBalance: balance
  };

  const mockLeaderboard = [
    { username: 'DragonKing', avatar: '🐉', totalWinnings: 15674.50, totalBets: 89, biggestWin: 2500.00 },
    { username: 'LuckyPlayer', avatar: '🍀', totalWinnings: 12456.75, totalBets: 67, biggestWin: 1800.00 },
    { username: 'TigerMaster', avatar: '🐅', totalWinnings: 9834.25, totalBets: 78, biggestWin: 1650.00 },
    { username: 'CardShark', avatar: '♠️', totalWinnings: 8765.50, totalBets: 56, biggestWin: 1400.00 },
    { username: 'WinnerPro', avatar: '💎', totalWinnings: 7654.75, totalBets: 89, biggestWin: 1200.00 }
  ];

  const betAmounts = [50, 100, 250, 500, 1000, 2500];
  const periodOptions = [
    { value: '30s', label: '30 Seconds', duration: 30 },
    { value: '1m', label: '1 Minute', duration: 60 },
    { value: '3m', label: '3 Minutes', duration: 180 },
    { value: '5m', label: '5 Minutes', duration: 300 }
  ];

  // Demo timer
  useEffect(() => {
    if (demoRunning) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            setCurrentPeriod(prev => prev + 1);
            return 60000; // Reset to 1 minute
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [demoRunning]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'dragon': return <FaDragon className="text-danger" />;
      case 'tiger': return <FaTiger className="text-warning" />;
      case 'tie': return <FaEquals className="text-success" />;
      default: return null;
    }
  };

  const handleBetClick = (betType) => {
    alert(`Demo: Placed $${betAmount} bet on ${betType}!\n\nIn the real app, this would:\n- Deduct from your balance\n- Place the bet in the current period\n- Show real-time updates\n- Process wins/losses automatically`);
  };

  const currentGame = gameTypes.find(g => g.id === selectedGame) || gameTypes[0];

  return (
    <div className="games-demo-page">
      {/* Demo Banner */}
      <Alert color="info" className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <strong>🎮 Frontend Demo Preview</strong> - This is a demonstration of the period-based gaming interface with mock data.
          </div>
          <div>
            <Button 
              size="sm" 
              color={demoRunning ? 'warning' : 'success'} 
              onClick={() => setDemoRunning(!demoRunning)}
            >
              {demoRunning ? <FaPause /> : <FaPlay />}
              {demoRunning ? ' Pause Demo' : ' Start Demo'}
            </Button>
          </div>
        </div>
      </Alert>

      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-gradient-dark text-white">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-0">
                    <MdSportsEsports className="me-2" />
                    Period-Based Gaming Platform
                  </h2>
                  <p className="mb-0 opacity-75">Live gaming with multiple time periods - Demo Mode</p>
                </div>
                <div className="text-end">
                  <h4 className="mb-0">${balance.toFixed(2)}</h4>
                  <small>Demo Balance</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Navigation Tabs */}
      <Row className="mb-4">
        <Col>
          <Nav tabs>
            <NavItem>
              <NavLink
                className={activeTab === '1' ? 'active' : ''}
                onClick={() => setActiveTab('1')}
                style={{ cursor: 'pointer' }}
              >
                <FaDragon className="me-1" />
                Dragon vs Tiger Demo
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '2' ? 'active' : ''}
                onClick={() => setActiveTab('2')}
                style={{ cursor: 'pointer' }}
              >
                <MdTimer className="me-1" />
                All Live Periods
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '3' ? 'active' : ''}
                onClick={() => setActiveTab('3')}
                style={{ cursor: 'pointer' }}
              >
                <MdLeaderboard className="me-1" />
                Leaderboard
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '4' ? 'active' : ''}
                onClick={() => setActiveTab('4')}
                style={{ cursor: 'pointer' }}
              >
                <MdTrendingUp className="me-1" />
                Statistics
              </NavLink>
            </NavItem>
          </Nav>
        </Col>
      </Row>

      {/* Tab Content */}
      <TabContent activeTab={activeTab}>
        {/* Dragon Tiger Demo Tab */}
        <TabPane tabId="1">
          <Row>
            {/* Game Area */}
            <Col lg={8}>
              {/* Current Period */}
              <Card className="mb-4">
                <CardHeader className="bg-dark text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <MdTimer className="me-2" />
                      Current Period: #{currentPeriod}
                    </h5>
                    <div className="d-flex align-items-center">
                      <Badge color={timeRemaining > 10000 ? 'success' : 'danger'} className="me-2">
                        {formatTime(timeRemaining)}
                      </Badge>
                      <Badge color="info">
                        123 Players
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* Period Selection */}
                  <Row className="mb-3">
                    <Col>
                      <ButtonGroup size="sm">
                        {periodOptions.map(option => (
                          <Button
                            key={option.value}
                            color={option.value === '1m' ? 'primary' : 'outline-primary'}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </ButtonGroup>
                    </Col>
                  </Row>

                  {/* Betting Interface */}
                  <Row className="mb-4">
                    <Col md={4}>
                      <Card className="betting-card dragon-card" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleBetClick('Dragon')}>
                        <CardBody className="text-center">
                          <FaDragon size={48} className="text-danger mb-2" />
                          <h4 className="text-danger">DRAGON</h4>
                          <Badge color="danger" pill>1.95x</Badge>
                          <div className="mt-2">
                            <small className="text-muted">Higher Card Wins</small>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                    
                    <Col md={4}>
                      <Card className="betting-card tie-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleBetClick('Tie')}>
                        <CardBody className="text-center">
                          <FaEquals size={48} className="text-success mb-2" />
                          <h4 className="text-success">TIE</h4>
                          <Badge color="success" pill>8.0x</Badge>
                          <div className="mt-2">
                            <small className="text-muted">Equal Card Values</small>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                    
                    <Col md={4}>
                      <Card className="betting-card tiger-card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleBetClick('Tiger')}>
                        <CardBody className="text-center">
                          <FaTiger size={48} className="text-warning mb-2" />
                          <h4 className="text-warning">TIGER</h4>
                          <Badge color="warning" pill>1.95x</Badge>
                          <div className="mt-2">
                            <small className="text-muted">Higher Card Wins</small>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>

                  {/* Bet Amount Selection */}
                  <Row>
                    <Col md={6}>
                      <label className="form-label">Bet Amount</label>
                      <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(Number(e.target.value))}
                        min={1}
                        max={10000}
                      />
                    </Col>
                    <Col md={6}>
                      <label className="form-label">Quick Amounts</label>
                      <div className="d-flex flex-wrap gap-1">
                        {betAmounts.map(amount => (
                          <Button
                            key={amount}
                            size="sm"
                            color={betAmount === amount ? 'primary' : 'outline-primary'}
                            onClick={() => setBetAmount(amount)}
                          >
                            ${amount}
                          </Button>
                        ))}
                      </div>
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {/* Recent Results */}
              <Card>
                <CardHeader>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <MdHistory className="me-2" />
                      Recent Results
                    </h5>
                    <Button size="sm" color="outline-primary" onClick={() => setShowHistoryModal(true)}>
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="result-chain d-flex flex-wrap gap-2">
                    {mockHistory.map((game, index) => (
                      <div
                        key={index}
                        className={`result-item ${game.result?.winner}`}
                        title={`Period ${game.periodNumber}: ${game.result?.winner}`}
                      >
                        {getResultIcon(game.result?.winner)}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </Col>

            {/* Sidebar */}
            <Col lg={4}>
              {/* Statistics */}
              <Card className="mb-4">
                <CardHeader>
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <MdTrendingUp className="me-2" />
                      Game Statistics
                    </h6>
                    <Button size="sm" color="outline-info" onClick={() => setShowStatsModal(true)}>
                      Details
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span><FaDragon className="text-danger me-1" />Dragon</span>
                      <span>{mockTrends.distribution.dragon.percentage}%</span>
                    </div>
                    <Progress value={mockTrends.distribution.dragon.percentage} color="danger" />
                  </div>
                  
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span><FaTiger className="text-warning me-1" />Tiger</span>
                      <span>{mockTrends.distribution.tiger.percentage}%</span>
                    </div>
                    <Progress value={mockTrends.distribution.tiger.percentage} color="warning" />
                  </div>
                  
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span><FaEquals className="text-success me-1" />Tie</span>
                      <span>{mockTrends.distribution.tie.percentage}%</span>
                    </div>
                    <Progress value={mockTrends.distribution.tie.percentage} color="success" />
                  </div>

                  <Alert color="warning">
                    <strong>Current Streak:</strong><br />
                    {getResultIcon(mockTrends.currentStreak.type)} {mockTrends.currentStreak.type.toUpperCase()} × {mockTrends.currentStreak.count}
                  </Alert>
                </CardBody>
              </Card>

              {/* User Stats */}
              <Card>
                <CardHeader>
                  <h6 className="mb-0">
                    <MdVerifiedUser className="me-2" />
                    Your Performance
                  </h6>
                </CardHeader>
                <CardBody>
                  <div className="user-stats">
                    <div className="stat-row">
                      <span>Games Played:</span>
                      <strong>{mockUserStats.gamesPlayed}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Win Rate:</span>
                      <strong className="text-success">{mockUserStats.winRate}%</strong>
                    </div>
                    <div className="stat-row">
                      <span>Total Winnings:</span>
                      <strong className="text-success">${mockUserStats.totalWinnings.toFixed(2)}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Profit/Loss:</span>
                      <strong className="text-success">${mockUserStats.profitLoss.toFixed(2)}</strong>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* All Live Periods Tab */}
        <TabPane tabId="2">
          <Row>
            {gameTypes.map(game => (
              <Col lg={6} xl={4} key={game.id} className="mb-4">
                <Card className="h-100">
                  <CardHeader className={`bg-${game.color} text-white`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">
                        {game.icon}
                        <span className="ms-2">{game.name}</span>
                      </h6>
                      <Button size="sm" color="light">
                        Play
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <p className="text-muted small mb-3">{game.description}</p>
                    
                    <div className="periods-list">
                      {game.periods.map(period => (
                        <div key={period.id} className="period-item mb-2 p-2 border rounded">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <Badge color="info" className="me-2">
                                {period.duration}
                              </Badge>
                              <small>#{currentPeriod + parseInt(period.id)}</small>
                            </div>
                            <div className="text-end">
                              <Badge color="success" className="mb-1">
                                {formatTime(period.timeLeft)}
                              </Badge>
                              <br />
                              <small className="text-muted">
                                {period.players} players
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        {/* Leaderboard Tab */}
        <TabPane tabId="3">
          <Row>
            <Col lg={8}>
              <Card>
                <CardHeader>
                  <h5 className="mb-0">
                    <MdLeaderboard className="me-2" />
                    Daily Leaderboard
                  </h5>
                </CardHeader>
                <CardBody>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Total Winnings</th>
                        <th>Games Won</th>
                        <th>Biggest Win</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockLeaderboard.map((player, index) => (
                        <tr key={index}>
                          <td>
                            <Badge 
                              color={index === 0 ? 'warning' : index === 1 ? 'secondary' : index === 2 ? 'info' : 'light'}
                            >
                              #{index + 1}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar me-2">
                                {player.avatar}
                              </div>
                              <span>{player.username}</span>
                            </div>
                          </td>
                          <td className="text-success fw-bold">${player.totalWinnings.toFixed(2)}</td>
                          <td>{player.totalBets}</td>
                          <td className="text-primary">${player.biggestWin.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
            
            <Col lg={4}>
              <Card>
                <CardHeader>
                  <h6 className="mb-0">Your Ranking</h6>
                </CardHeader>
                <CardBody>
                  <div className="text-center mb-3">
                    <Badge color="primary" pill className="p-2">
                      Your Position: #4
                    </Badge>
                  </div>
                  
                  <div className="ranking-stats">
                    <div className="stat-row">
                      <span>Today's Winnings:</span>
                      <strong className="text-success">$1,234.50</strong>
                    </div>
                    <div className="stat-row">
                      <span>Games Played:</span>
                      <strong>{mockUserStats.gamesPlayed}</strong>
                    </div>
                    <div className="stat-row">
                      <span>Win Rate:</span>
                      <strong className="text-success">{mockUserStats.winRate}%</strong>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* Statistics Tab */}
        <TabPane tabId="4">
          <Row>
            <Col lg={8}>
              <Card>
                <CardHeader>
                  <h5 className="mb-0">
                    <MdTrendingUp className="me-2" />
                    Game Performance (Demo Data)
                  </h5>
                </CardHeader>
                <CardBody>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Game</th>
                        <th>Volume (24h)</th>
                        <th>Players</th>
                        <th>House Edge</th>
                        <th>Popularity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameTypes.map((game, index) => {
                        const volume = Math.floor(Math.random() * 100000) + 50000;
                        const players = Math.floor(Math.random() * 500) + 100;
                        const popularity = Math.floor(Math.random() * 100);
                        
                        return (
                          <tr key={game.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className={`text-${game.color} me-2`}>
                                  {game.icon}
                                </span>
                                {game.name}
                              </div>
                            </td>
                            <td className="fw-bold">${volume.toLocaleString()}</td>
                            <td>{players}</td>
                            <td>2.5%</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <Progress 
                                  value={popularity} 
                                  color={game.color}
                                  style={{ width: '60px', height: '8px' }}
                                  className="me-2"
                                />
                                <span className="small">{popularity}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            </Col>
            
            <Col lg={4}>
              <Card>
                <CardHeader>
                  <h6 className="mb-0">Your Statistics</h6>
                </CardHeader>
                <CardBody>
                  <div className="user-stats">
                    <div className="stat-item mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Total Games:</span>
                        <strong>{mockUserStats.gamesPlayed}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Win Rate:</span>
                        <strong className="text-success">{mockUserStats.winRate}%</strong>
                      </div>
                      <Progress 
                        value={mockUserStats.winRate} 
                        color="success"
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="stat-item mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Profit/Loss:</span>
                        <strong className="text-success">${mockUserStats.profitLoss.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </TabContent>

      {/* Modals */}
      <Modal isOpen={showStatsModal} toggle={() => setShowStatsModal(false)} size="lg">
        <ModalHeader toggle={() => setShowStatsModal(false)}>
          Detailed Statistics (Demo)
        </ModalHeader>
        <ModalBody>
          <p>This modal would show comprehensive game statistics including:</p>
          <ul>
            <li>Win/Loss distribution</li>
            <li>Hot and cold streaks</li>
            <li>Player count trends</li>
            <li>Revenue analytics</li>
            <li>Betting pattern analysis</li>
          </ul>
        </ModalBody>
      </Modal>

      <Modal isOpen={showHistoryModal} toggle={() => setShowHistoryModal(false)} size="lg">
        <ModalHeader toggle={() => setShowHistoryModal(false)}>
          Game History (Demo)
        </ModalHeader>
        <ModalBody>
          <Table responsive size="sm">
            <thead>
              <tr>
                <th>Period</th>
                <th>Result</th>
                <th>Players</th>
                <th>Total Bets</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((game, index) => (
                <tr key={index}>
                  <td>#{game.periodNumber}</td>
                  <td>
                    {getResultIcon(game.result?.winner)}
                    <span className="ms-1">{game.result?.winner}</span>
                  </td>
                  <td>{game.playersCount}</td>
                  <td>${game.totalBets?.toFixed(2)}</td>
                  <td>{game.endTime.toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </ModalBody>
      </Modal>

      <style jsx>{`
        .betting-card {
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .betting-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .dragon-card:hover {
          border-color: #dc3545;
        }
        
        .tiger-card:hover {
          border-color: #ffc107;
        }
        
        .tie-card:hover {
          border-color: #28a745;
        }
        
        .result-item {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: 2px solid #ddd;
          background: white;
        }
        
        .result-item.dragon {
          background: #dc3545;
          color: white;
          border-color: #dc3545;
        }
        
        .result-item.tiger {
          background: #ffc107;
          color: white;
          border-color: #ffc107;
        }
        
        .result-item.tie {
          background: #28a745;
          color: white;
          border-color: #28a745;
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .period-item {
          transition: background-color 0.3s ease;
        }
        
        .period-item:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default GamesDemoPage;