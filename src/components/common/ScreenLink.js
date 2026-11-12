import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';

/**
 * A link to another screen that degrades to plain content when there is no
 * router (App.js renders the screens without one).
 */
const ScreenLink = ({ to, children, fallback = 'span', ...rest }) => {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Link to={to} {...rest}>
        {children}
      </Link>
    );
  }
  const Fallback = fallback;
  return <Fallback {...rest}>{children}</Fallback>;
};

export default ScreenLink;
