import React, { useState, useEffect, useCallback } from 'react';
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
  TabPane
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
  FaGem
} from 'react-icons/fa';
import { 
  MdTimer, 
  MdTrendingUp, 
  MdLeaderboard, 
  MdHistory,
  MdCasino,
  MdSportsEsports
} from 'react-icons/md';
import { toast } from 'react-toastify';
import { useHistory } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

const PeriodGamesPage = () => {
  const [allPeriods, setAllPeriods] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [gameStats, setGameStats] = useState({});
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedGame, setSelectedGame] = useState('all');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  
  const history = useHistory();

  const gameTypes = [
    { 
      id: 'dragon-tiger', 
      name: 'Dragon vs Tiger', 
      icon: <FaDragon />, 
      color: 'danger',
      description: 'Classic card battle - Dragon vs Tiger'
    },
    { 
      id: 'lucky7', 
      name: 'Lucky 7', 
      icon: <FaGem />, 
      color: 'success',
      description: 'Two cards sum - Under, Lucky, or Over 7'
    },
    { 
      id: 'roulette', 
      name: 'Roulette', 
      icon: <FaDice />, 
      color: 'warning',
      description: 'European roulette with live spins'
    },
    { 
      id: 'blackjack', 
      name: 'Blackjack', 
      icon: <FaSpade />, 
      color: 'dark',
      description: 'Classic 21 with side bets'
    },
    { 
      id: 'live-blackjack', 
      name: 'Live Blackjack', 
      icon: <FaCrown />, 
      color: 'primary',
      description: 'Blackjack with AI dealers'
    },
    { 
      id: 'three-card-poker', 
      name: '3 Card Poker', 
      icon: <FaHeart />, 
      color: 'info',
      description: 'Fast-paced poker variant'
    },
    { 
      id: 'four-card-poker', 
      name: '4 Card Poker', 
      icon: <FaDiamond />, 
      color: 'secondary',
      description: 'Extended poker action'
    },
    { 
      id: 'caribbean-stud', 
      name: 'Caribbean Stud', 
      icon: <FaClub />, 
      color: 'success',
      description: '5-card stud against dealer'
    },
    { 
      id: 'texas-holdem', 
      name: "Texas Hold'em", 
      icon: <FaFire />, 
      color: 'warning',
      description: 'Community card poker'
    }
  ];

  const periodDurations = ['30s', '1m', '3m', '5m'];

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const newSocket = io('http://localhost:7777', {
        auth: { token }
      });
      
      newSocket.on('connect', () => {
        console.log('Connected to gaming server');
      });

      newSocket.on('periodStarted', (data) => {
        fetchAllPeriods();
      });

      newSocket.on('periodCompleted', (data) => {
        fetchAllPeriods();
        fetchLeaderboard();
        toast.info(`${data.gameType} Period ${data.periodNumber} completed!`);
      });

      setSocket(newSocket);

      return () => newSocket.close();
    }
  }, []);

  // Fetch all active periods
  const fetchAllPeriods = useCallback(async () => {
    try {
      const response = await axios.get('/api/games/periods');
      setAllPeriods(response.data.data.periods);
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  }, []);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await axios.get('/api/games/leaderboard?period=daily&limit=10');
      setLeaderboard(response.data.data.leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  }, []);

  // Fetch user stats
  const fetchUserStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/games/my-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserStats(response.data.data.userStats);
        setBalance(response.data.data.userStats.currentBalance);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, []);

  // Fetch game statistics
  const fetchGameStats = useCallback(async () => {
    try {
      const statsPromises = gameTypes.map(async (game) => {
        const response = await axios.get(`/api/games/stats/${game.id}?days=7`);
        return { gameType: game.id, ...response.data.data.gameStats };
      });
      
      const stats = await Promise.all(statsPromises);
      const statsMap = {};
      stats.forEach(stat => {
        if (stat) {
          statsMap[stat.gameType] = stat;
        }
      });
      setGameStats(statsMap);
    } catch (error) {
      console.error('Error fetching game stats:', error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllPeriods();
    fetchLeaderboard();
    fetchUserStats();
    fetchGameStats();
  }, [fetchAllPeriods, fetchLeaderboard, fetchUserStats, fetchGameStats]);

  // Navigate to specific game
  const navigateToGame = (gameType) => {
    const gameRoutes = {
      'dragon-tiger': '/dragon-tiger',
      'lucky7': '/lucky7',
      'roulette': '/roulette',
      'blackjack': '/blackjack',
      'live-blackjack': '/live-blackjack'
    };
    
    if (gameRoutes[gameType]) {
      history.push(gameRoutes[gameType]);
    } else {
      toast.info(`${gameType} page coming soon!`);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (timeRemaining) => {
    if (timeRemaining <= 0) return 'CLOSED';
    const seconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get periods for specific game
  const getGamePeriods = (gameType) => {
    return allPeriods.filter(period => period.gameType === gameType);
  };

  // Get game icon
  const getGameIcon = (gameType) => {
    const game = gameTypes.find(g => g.id === gameType);
    return game?.icon || <MdCasino />;
  };

  // Get game color
  const getGameColor = (gameType) => {
    const game = gameTypes.find(g => g.id === gameType);
    return game?.color || 'primary';
  };

  return (
    <div className="period-games-page">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <Card className="bg-gradient-dark text-white">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-0">
                    <MdSportsEsports className="me-2" />
                    Period-Based Gaming Hub
                  </h2>
                  <p className="mb-0 opacity-75">Live gaming with multiple time periods</p>
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
                <MdTimer className="me-1" />
                Live Periods
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '2' ? 'active' : ''}
                onClick={() => setActiveTab('2')}
                style={{ cursor: 'pointer' }}
              >
                <MdCasino className="me-1" />
                Game Lobby
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
        {/* Live Periods Tab */}
        <TabPane tabId="1">
          <Row>
            {gameTypes.map(game => {
              const periods = getGamePeriods(game.id);
              return (
                <Col lg={6} xl={4} key={game.id} className="mb-4">
                  <Card className="h-100">
                    <CardHeader className={`bg-${game.color} text-white`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0">
                          {game.icon}
                          <span className="ms-2">{game.name}</span>
                        </h6>
                        <Button 
                          size="sm" 
                          color="light" 
                          onClick={() => navigateToGame(game.id)}
                        >
                          Play
                        </Button>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <p className="text-muted small mb-3">{game.description}</p>
                      
                      {periods.length > 0 ? (
                        <div className="periods-list">
                          {periods.map(period => (
                            <div key={period.id} className="period-item mb-2 p-2 border rounded">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <Badge color="info" className="me-2">
                                    {period.duration || '60'}s
                                  </Badge>
                                  <small>#{period.periodNumber}</small>
                                </div>
                                <div className="text-end">
                                  <Badge 
                                    color={period.timeRemaining > 10000 ? 'success' : 'danger'}
                                    className="mb-1"
                                  >
                                    {formatTimeRemaining(period.timeRemaining)}
                                  </Badge>
                                  <br />
                                  <small className="text-muted">
                                    {period.playersCount} players
                                  </small>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Alert color="info">
                          No active periods. Next period starting soon...
                        </Alert>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </TabPane>

        {/* Game Lobby Tab */}
        <TabPane tabId="2">
          <Row>
            {gameTypes.map(game => (
              <Col lg={6} xl={4} key={game.id} className="mb-4">
                <Card className="game-card h-100" style={{ cursor: 'pointer' }} onClick={() => navigateToGame(game.id)}>
                  <CardBody className="text-center">
                    <div className={`game-icon text-${game.color} mb-3`}>
                      {React.cloneElement(game.icon, { size: 48 })}
                    </div>
                    <h5 className="card-title">{game.name}</h5>
                    <p className="text-muted mb-3">{game.description}</p>
                    
                    <div className="mb-3">
                      <Row>
                        <Col>
                          <small className="text-muted">Available Periods</small>
                          <div className="period-badges">
                            {periodDurations.map(duration => (
                              <Badge key={duration} color="outline-secondary" className="me-1">
                                {duration}
                              </Badge>
                            ))}
                          </div>
                        </Col>
                      </Row>
                    </div>

                    {gameStats[game.id] && (
                      <div className="game-stats">
                        <Row className="text-center">
                          <Col>
                            <small className="text-muted">24h Volume</small>
                            <div className="fw-bold">${gameStats[game.id].totalBets?.toFixed(0) || '0'}</div>
                          </Col>
                          <Col>
                            <small className="text-muted">Players</small>
                            <div className="fw-bold">{gameStats[game.id].uniquePlayersCount || 0}</div>
                          </Col>
                        </Row>
                      </div>
                    )}

                    <Button color={game.color} className="mt-3" block>
                      Play Now
                    </Button>
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
                      {leaderboard.map((player, index) => (
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
                                {player.avatar || '👤'}
                              </div>
                              <span>{player.username}</span>
                            </div>
                          </td>
                          <td className="text-success fw-bold">${player.totalWinnings?.toFixed(2)}</td>
                          <td>{player.totalBets}</td>
                          <td className="text-primary">${player.biggestWin?.toFixed(2)}</td>
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
                  <div className="user-ranking">
                    <div className="text-center mb-3">
                      <div className="ranking-position">
                        <Badge color="primary" pill className="p-2">
                          Your Position: #--
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="ranking-stats">
                      <div className="stat-row">
                        <span>Today's Winnings:</span>
                        <strong className="text-success">$0.00</strong>
                      </div>
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
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card className="mt-3">
                <CardHeader>
                  <h6 className="mb-0">Achievement Badges</h6>
                </CardHeader>
                <CardBody>
                  <div className="achievements">
                    <Badge color="warning" className="me-2 mb-2">🏆 First Win</Badge>
                    <Badge color="info" className="me-2 mb-2">🎯 10 Games</Badge>
                    <Badge color="success" className="me-2 mb-2">💎 Big Winner</Badge>
                    <Badge color="secondary" className="me-2 mb-2">🔥 Hot Streak</Badge>
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
                    Game Performance (7 Days)
                  </h5>
                </CardHeader>
                <CardBody>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Game</th>
                        <th>Total Volume</th>
                        <th>Total Bets</th>
                        <th>Players</th>
                        <th>House Edge</th>
                        <th>Popularity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameTypes.map(game => {
                        const stats = gameStats[game.id];
                        const maxVolume = Math.max(...Object.values(gameStats).map(s => s?.totalBets || 0));
                        const popularity = stats?.totalBets ? (stats.totalBets / maxVolume * 100) : 0;
                        
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
                            <td className="fw-bold">${stats?.totalBets?.toFixed(0) || '0'}</td>
                            <td>{stats?.totalBets || 0}</td>
                            <td>{stats?.uniquePlayersCount || 0}</td>
                            <td>{stats?.houseEdge?.toFixed(2) || '2.5'}%</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <Progress 
                                  value={popularity} 
                                  color={game.color}
                                  style={{ width: '60px', height: '8px' }}
                                  className="me-2"
                                />
                                <span className="small">{popularity.toFixed(0)}%</span>
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
                        <strong>{userStats.gamesPlayed || 0}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Games Won:</span>
                        <strong className="text-success">{userStats.gamesWon || 0}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Win Rate:</span>
                        <strong className={userStats.winRate >= 50 ? 'text-success' : 'text-danger'}>
                          {userStats.winRate?.toFixed(1) || 0}%
                        </strong>
                      </div>
                      <Progress 
                        value={userStats.winRate || 0} 
                        color={userStats.winRate >= 50 ? 'success' : 'danger'}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="stat-item mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Total Winnings:</span>
                        <strong className="text-success">${userStats.totalWinnings?.toFixed(2) || '0.00'}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item mb-3">
                      <div className="d-flex justify-content-between">
                        <span>Profit/Loss:</span>
                        <strong className={userStats.profitLoss >= 0 ? 'text-success' : 'text-danger'}>
                          ${userStats.profitLoss?.toFixed(2) || '0.00'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </TabContent>

      <style jsx>{`
        .game-card {
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .game-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          border-color: #007bff;
        }
        
        .game-icon {
          transition: transform 0.3s ease;
        }
        
        .game-card:hover .game-icon {
          transform: scale(1.1);
        }
        
        .period-item {
          transition: background-color 0.3s ease;
        }
        
        .period-item:hover {
          background-color: #f8f9fa;
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
          font-size: 14px;
        }
        
        .period-badges .badge {
          font-size: 0.7rem;
        }
        
        .ranking-position {
          margin-bottom: 1rem;
        }
        
        .achievements .badge {
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
};

export default PeriodGamesPage;