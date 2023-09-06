import { useEffect, useState } from 'react';

const useScroll = () => {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const elem = document.getElementById('main');
    if (!elem) {
      return;
    }
    const listener = () => {
      if (elem.scrollTop + elem.clientHeight === elem.scrollHeight) {
        setDisabled(false);
      } else {
        setDisabled(true);
      }
    };
    elem.addEventListener('scroll', listener);

    return () => {
      elem.removeEventListener('scroll', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    scrollToTop: () => {
      if (!disabled) {
        document.getElementById('main')?.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
      }
    },
    scrollToBottom: () => {
      if (!disabled) {
        document.getElementById('main')?.scrollTo({
          top: document.getElementById('main')?.scrollHeight,
          behavior: 'smooth',
        });
      }
    },
  };
};

export default useScroll;
