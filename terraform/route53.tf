# ============================================================
# Route53
# wecnedu.com Hosted Zone
# ============================================================

data "aws_route53_zone" "wecnedu" {
  name         = "wecnedu.com"
  private_zone = false
}


# ============================================================
# API
# api.wecnedu.com -> NGINX Ingress Load Balancer
# ============================================================

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.wecnedu.zone_id
  name    = "api.wecnedu.com"
  type    = "CNAME"
  ttl     = 300

  records = [
    "a601fb68ad771467d896fd9a028ef580-831148130.ap-northeast-2.elb.amazonaws.com"
  ]
}


# ============================================================
# Frontend
# www.wecnedu.com -> NGINX Ingress Load Balancer
# ============================================================

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.wecnedu.zone_id
  name    = "www.wecnedu.com"
  type    = "CNAME"
  ttl     = 300

  records = [
    "a601fb68ad771467d896fd9a028ef580-831148130.ap-northeast-2.elb.amazonaws.com"
  ]
}