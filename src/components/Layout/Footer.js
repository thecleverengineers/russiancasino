import React from 'react';
import { NavLink } from 'react-router-dom';
import {   NavLink as BSNavLink,Navbar, Nav, NavItem } from 'reactstrap';
import {
  FaHome,
  FaCoins,
 FaTrophy,
 FaUser
} from 'react-icons/fa';
import {
  GiCardPlay,GiWallet,GiCrownCoin,GiTicket
} from 'react-icons/gi';
import {
  HiSupport
} from 'react-icons/hi';
import {
  AiOutlineLogin
} from 'react-icons/ai';
import bn from 'utils/bemnames';
const bem = bn.create('footer');

const Footer = () => {
  var navItems;
  if(localStorage.getItem('auth')){
    navItems = [
      { to: '/', name: 'Home', exact: true, Icon: FaHome },
      { to: '/raffle', name: 'Raffle', exact: true, Icon: GiTicket },
      
      { to: '/play', name: 'Color', exact: true, Icon: GiCardPlay },

      { to: '/toss', name: 'Toss', exact: true, Icon: GiCrownCoin },
      { to: '/account', name: 'Account', exact: false, Icon: FaUser },
      // { to: '/about', name: 'About', exact: false, Icon: MdContactMail }
    
    ];
  }else{
    navItems = [
   
      { to: '/', name: 'Home', exact: true, Icon: FaHome },
      // { to: '/admin', name: 'Admin', exact: false, Icon: FaUserEdit },
      { to: '/login', name: 'Signin', exact: false, Icon: AiOutlineLogin },
      // { to: '/about', name: 'About', exact: false, Icon: MdContactMail }
    
    ];
  }
  return (
    <Navbar className="footer" style={{
      background: 'rgba(255,255,255,0.18)',
      boxShadow: '0 -8px 32px 0 rgba(31, 38, 135, 0.10)',
      borderTop: '4px solid #49a09d',
      backdropFilter: 'blur(12px)',
      borderRadius: '18px 18px 0 0',
      animation: 'fadeIn 0.7s cubic-bezier(0.4,0,0.2,1) both',
      minHeight: '64px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 2rem',
      marginTop: '2rem',
    }}>
      <Nav navbar style={{width:'100%', justifyContent:'space-around'}}>
        {navItems.map(({ to, name, exact, Icon }, index) => (
              <NavItem key={index} className={bem.e('nav-item')} style={{margin:'0 1.5rem'}}>
                <BSNavLink
                  id={`navItem-${name}-${index}`}
                  className="text-uppercase"
                  tag={NavLink}
                  to={to}
                  activeClassName="active"
                  exact={exact}
                  style={{display:'flex', flexDirection:'column', alignItems:'center', fontFamily:'Roboto, Helvetica, Arial, sans-serif', fontWeight:500, fontSize:'1.1rem', color:'#5f2c82'}}
                >
                  <Icon className={bem.e('nav-item-icon')} style={{fontSize:'2rem', marginBottom:2}} />
                  <span className="" style={{marginTop:2}}>{name}</span>
                </BSNavLink>
              </NavItem>
            ))}
      </Nav>
    </Navbar>
  );
};

export default Footer;
