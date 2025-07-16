import React, { useState, useEffect, useCallback } from 'react';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  Table,
  Progress,
  Input,
  ButtonGroup
} from 'reactstrap';
import { MdTimer, MdTrendingUp, MdHistory, MdVerifiedUser } from 'react-icons/md';
import { FaDragon, FaTiger, FaEquals, FaFire, FaSnowflake } from 'react-icons/fa';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import axios from 'axios';

const DragonTigerPage = () => {
  const [activePeriods, setActivePeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('1m');
  const [betAmount, setBetAmount] = useState(100);
  const [selectedBet, setSelectedBet] = useState('');
  const [gameHistory, setGameHistory] = useState([]);
  const [trends, setTrends] = useState({});
  const [userStats, setUserStats] = useState({});
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [balance, setBalance] = useState(0);

  const betAmounts = [50, 100, 250, 500, 1000, 2500];
  const periodOptions = [
    { value: '30s', label: '30 Seconds', duration: 30 },
    { value: '1m', label: '1 Minute', duration: 60 },
    { value: '3m', label: '3 Minutes', duration: 180 },
    { value: '5m', label: '5 Minutes', duration: 300 }
  ];

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const newSocket = io('http://localhost:7777', {
        auth: { token }
      });
      
      newSocket.on('connect', () => {
        console.log('Connected to game server');
      });

      newSocket.on('periodStarted', (data) => {
        if (data.gameType === 'dragon-tiger') {
          fetchActivePeriods();
        }
      });

      newSocket.on('betPlaced', (data) => {
        if (data.periodId === currentPeriod?.id) {
          setCurrentPeriod(prev => ({
            ...prev,
            totalBets: data.totalBets
          }));
        }
      });

      newSocket.on('periodCompleted', (data) => {
        if (data.gameType === 'dragon-tiger') {
          fetchGameHistory();
          fetchTrends();
          toast.success(`Period ${data.periodNumber} completed!`);
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, []);

  // Fetch active periods
  const fetchActivePeriods = useCallback(async () => {
    try {
      const response = await axios.get('/api/games/periods?gameType=dragon-tiger');
      setActivePeriods(response.data.data.periods);
      
      const current = response.data.data.periods.find(p => p.status === 'betting');
      setCurrentPeriod(current);
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  }, []);

  // Fetch game history
  const fetchGameHistory = useCallback(async () => {
    try {
      const response = await axios.get('/api/games/history/dragon-tiger?limit=20');
      setGameHistory(response.data.data.history);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, []);

  // Fetch trends
  const fetchTrends = useCallback(async () => {
    try {
      const response = await axios.get('/api/games/trends/dragon-tiger');
      setTrends(response.data.data.trends);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  }, []);

  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/games/my-stats?gameType=dragon-tiger', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserStats(response.data.data.userStats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (currentPeriod && currentPeriod.status === 'betting') {
      const interval = setInterval(() => {
        const remaining = Math.max(0, new Date(currentPeriod.endTime).getTime() - Date.now());
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          fetchActivePeriods();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentPeriod, fetchActivePeriods]);

  // Initial data fetch
  useEffect(() => {
    fetchActivePeriods();
    fetchGameHistory();
    fetchTrends();
    fetchUserStats();
  }, [fetchActivePeriods, fetchGameHistory, fetchTrends, fetchUserStats]);

  // Place bet
  const placeBet = async (betType, selection) => {
    if (!currentPeriod || currentPeriod.status !== 'betting') {
      toast.error('No active betting period');
      return;
    }

    if (betAmount < 1 || betAmount > 10000) {
      toast.error('Bet amount must be between $1 and $10,000');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/games/bet', {
        gameType: 'dragon-tiger',
        periodType: selectedPeriod,
        betType,
        amount: betAmount,
        selection
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Bet placed successfully!');
        setBalance(response.data.data.newBalance);
        fetchUserStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

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

  const getWinStreakColor = (streak) => {
    if (streak >= 5) return 'danger';
    if (streak >= 3) return 'warning';
    return 'success';
  };

  return (
    <div className="dragon-tiger-page">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-gradient-primary text-white">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-0">
                    <FaDragon className="me-2" />
                    Dragon vs Tiger
                  </h2>
                  <p className="mb-0 opacity-75">Live Period-Based Gaming</p>
                </div>
                <div className="text-end">
                  <h4 className="mb-0">${balance?.toFixed(2) || '0.00'}</h4>
                  <small>Available Balance</small>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Game Area */}
        <Col lg={8}>
          {/* Current Period */}
          <Card className="mb-4">
            <CardHeader className="bg-dark text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <MdTimer className="me-2" />
                  Current Period: #{currentPeriod?.periodNumber || '---'}
                </h5>
                <div className="d-flex align-items-center">
                  <Badge color={timeRemaining > 10000 ? 'success' : 'danger'} className="me-2">
                    {timeRemaining > 0 ? formatTime(timeRemaining) : 'CLOSED'}
                  </Badge>
                  <Badge color="info">
                    {currentPeriod?.playersCount || 0} Players
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
                        color={selectedPeriod === option.value ? 'primary' : 'outline-primary'}
                        onClick={() => setSelectedPeriod(option.value)}
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
                        style={{ cursor: timeRemaining > 0 ? 'pointer' : 'not-allowed' }}
                        onClick={() => timeRemaining > 0 && placeBet('dragon', 'dragon')}>
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
                        style={{ cursor: timeRemaining > 0 ? 'pointer' : 'not-allowed' }}
                        onClick={() => timeRemaining > 0 && placeBet('tie', 'tie')}>
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
                        style={{ cursor: timeRemaining > 0 ? 'pointer' : 'not-allowed' }}
                        onClick={() => timeRemaining > 0 && placeBet('tiger', 'tiger')}>
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
                    disabled={timeRemaining === 0}
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
                        disabled={timeRemaining === 0}
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
                {gameHistory.slice(0, 20).map((game, index) => (
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
              {trends.distribution && (
                <>
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span><FaDragon className="text-danger me-1" />Dragon</span>
                      <span>{trends.distribution.dragon.percentage}%</span>
                    </div>
                    <Progress value={trends.distribution.dragon.percentage} color="danger" />
                  </div>
                  
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span><FaTiger className="text-warning me-1" />Tiger</span>
                      <span>{trends.distribution.tiger.percentage}%</span>
                    </div>
                    <Progress value={trends.distribution.tiger.percentage} color="warning" />
                  </div>
                  
                  <div className="stat-item mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span><FaEquals className="text-success me-1" />Tie</span>
                      <span>{trends.distribution.tie.percentage}%</span>
                    </div>
                    <Progress value={trends.distribution.tie.percentage} color="success" />
                  </div>

                  {trends.currentStreak && (
                    <Alert color={getWinStreakColor(trends.currentStreak.count)}>
                      <strong>Current Streak:</strong><br />
                      {getResultIcon(trends.currentStreak.type)} {trends.currentStreak.type.toUpperCase()} × {trends.currentStreak.count}
                    </Alert>
                  )}
                </>
              )}
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
                  <strong>{userStats.gamesPlayed || 0}</strong>
                </div>
                <div className="stat-row">
                  <span>Win Rate:</span>
                  <strong className={userStats.winRate >= 50 ? 'text-success' : 'text-danger'}>
                    {userStats.winRate?.toFixed(1) || 0}%
                  </strong>
                </div>
                <div className="stat-row">
                  <span>Total Winnings:</span>
                  <strong className="text-success">${userStats.totalWinnings?.toFixed(2) || '0.00'}</strong>
                </div>
                <div className="stat-row">
                  <span>Profit/Loss:</span>
                  <strong className={userStats.profitLoss >= 0 ? 'text-success' : 'text-danger'}>
                    ${userStats.profitLoss?.toFixed(2) || '0.00'}
                  </strong>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Statistics Modal */}
      <Modal isOpen={showStatsModal} toggle={() => setShowStatsModal(false)} size="lg">
        <ModalHeader toggle={() => setShowStatsModal(false)}>
          Detailed Statistics
        </ModalHeader>
        <ModalBody>
          {trends.distribution && (
            <Row>
              <Col md={6}>
                <h6>Result Distribution</h6>
                <Table size="sm">
                  <tbody>
                    <tr>
                      <td><FaDragon className="text-danger" /> Dragon</td>
                      <td>{trends.distribution.dragon.count}</td>
                      <td>{trends.distribution.dragon.percentage}%</td>
                    </tr>
                    <tr>
                      <td><FaTiger className="text-warning" /> Tiger</td>
                      <td>{trends.distribution.tiger.count}</td>
                      <td>{trends.distribution.tiger.percentage}%</td>
                    </tr>
                    <tr>
                      <td><FaEquals className="text-success" /> Tie</td>
                      <td>{trends.distribution.tie.count}</td>
                      <td>{trends.distribution.tie.percentage}%</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <h6>Streak Information</h6>
                {trends.currentStreak && (
                  <p><strong>Current:</strong> {trends.currentStreak.type} × {trends.currentStreak.count}</p>
                )}
                {trends.longestStreak && (
                  <p><strong>Longest:</strong> {trends.longestStreak.type} × {trends.longestStreak.count}</p>
                )}
                <p><strong>Total Games:</strong> {trends.totalGames}</p>
              </Col>
            </Row>
          )}
        </ModalBody>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={showHistoryModal} toggle={() => setShowHistoryModal(false)} size="lg">
        <ModalHeader toggle={() => setShowHistoryModal(false)}>
          Game History
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
              {gameHistory.map((game, index) => (
                <tr key={index}>
                  <td>#{game.periodNumber}</td>
                  <td>
                    {getResultIcon(game.result?.winner)}
                    <span className="ms-1">{game.result?.winner}</span>
                  </td>
                  <td>{game.playersCount}</td>
                  <td>${game.totalBets?.toFixed(2)}</td>
                  <td>{new Date(game.endTime).toLocaleTimeString()}</td>
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
        
        .user-stats {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default DragonTigerPage;