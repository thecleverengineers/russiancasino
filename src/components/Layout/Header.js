
import React from 'react';

import {
  Navbar
} from 'reactstrap';
import bn from 'utils/bemnames';
import logo200Image from 'assets/img/logo/logo_200.png';

const bem = bn.create('header');



class Header extends React.Component {
  state = {
    isOpenNotificationPopover: false,
    isNotificationConfirmed: false,
    isOpenUserCardPopover: false,
  };

  toggleNotificationPopover = () => {
    this.setState({
      isOpenNotificationPopover: !this.state.isOpenNotificationPopover,
    });

    if (!this.state.isNotificationConfirmed) {
      this.setState({ isNotificationConfirmed: true });
    }
  };

  toggleUserCardPopover = () => {
    this.setState({
      isOpenUserCardPopover: !this.state.isOpenUserCardPopover,
    });
  };

  handleSidebarControlButton = event => {
    event.preventDefault();
    event.stopPropagation();

    document.querySelector('.cr-sidebar').classList.toggle('cr-sidebar--open');
  };

  render() {

    return (
      <Navbar light expand className={bem.b('bg-white')} style={{
        background: 'rgba(255,255,255,0.18)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        borderBottom: '4px solid #5f2c82',
        backdropFilter: 'blur(12px)',
        borderRadius: '0 0 18px 18px',
        animation: 'fadeIn 0.7s cubic-bezier(0.4,0,0.2,1) both',
        minHeight: '70px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
      }}>
        <img src={logo200Image} alt="Logo" style={{height:40, marginRight:16, borderRadius:8, boxShadow:'0 2px 8px rgba(31,38,135,0.12)'}} />
        <h2 style={{color:'#5f2c82', fontWeight:700, fontSize:'2rem', letterSpacing:'0.03em', margin:0, fontFamily:'Roboto, Helvetica, Arial, sans-serif'}}>
          Welcome to The Titan Clubs
        </h2>
      </Navbar>
    );
  }
}

export default Header;
