#!/bin/sh

if ! command -v sshd > /dev/null 2>&1; then
    apk add --no-cache openssh
    mkdir -p /root/.ssh && chmod 700 /root/.ssh
    ssh-keygen -t rsa -b 2048 -f /root/.ssh/id_rsa -N ''
    cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys
    chmod 600 /root/.ssh/authorized_keys
    ls -al /root/.ssh
fi
ssh-keygen -A
/usr/sbin/sshd

sed -i 's/lns = .*/lns = '$VPN_SERVER_ADDR'/' /etc/xl2tpd/xl2tpd.conf
sed -i 's/name .*/name '$VPN_USERNAME'/' /etc/ppp/options.l2tpd.client
sed -i 's/password .*/password '$VPN_PASSWORD'/' /etc/ppp/options.l2tpd.client

(

    while true; do
        if ip route show dev ppp0 | grep -q 'proto'; then
            break
        fi
        echo "Waiting for route to appear..."
        sleep 5
    done
    
    for EACH_VPN_IP in $(echo $VPN_IPS_TO_ROUTE | tr ',' '\n'); do
        ip route add "$EACH_VPN_IP" via $VPN_GATEWAY_IP dev ppp0
    done

    echo "Starting SSH tunnel..."
    ssh -o StrictHostKeyChecking=no -N -D 0.0.0.0:$PROXY_PORT root@localhost
) &


# startup xl2tpd ppp daemon then send it a connect command
(sleep 7 && echo "c myVPN" > /var/run/xl2tpd/l2tp-control) &
exec /usr/sbin/xl2tpd -p /var/run/xl2tpd.pid -c /etc/xl2tpd/xl2tpd.conf -C /var/run/xl2tpd/l2tp-control -D