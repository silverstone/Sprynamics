import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutService } from '#app/checkout/checkout.service';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})
export class OrderSummaryComponent implements OnInit, OnDestroy {

  get nextRoute() {
    switch (this.router.url) {
      case '/checkout/shipping-info':
        return '/checkout/payment-method';
      case '/checkout/payment-method':
        return '/checkout/confirm-order';
    }
  }

  subtotal = 0;
  shipping = 0;
  total = 0;

  orderSub: Subscription;
  braintreeSub: Subscription;

  instance: any;

  constructor(public router: Router, private checkout: CheckoutService) { }

  ngOnInit() {
    this.orderSub = this.checkout.order.subscribe(order => {
      this.subtotal = order.subtotal;
      this.shipping = order.shippingCost;
      this.total = order.total;
    });

    this.braintreeSub = this.checkout.braintreeUI.subscribe(instance => {
      this.instance = instance;
    });
  }

  ngOnDestroy() {
    this.orderSub.unsubscribe();
    this.braintreeSub.unsubscribe();
  }

  clickCheckout() {
    if (this.router.url.endsWith('shipping-info')) {
      this.router.navigate(['/checkout/payment-method']);
    } else if (this.router.url.endsWith('payment-method')) {
      this.checkout.loading = true;
      if (this.instance) {
        this.instance.requestPaymentMethod((err, payload) => {
          if (err) {
            window.alert(err.message);
          } else {
            this.checkout.updateOrder('nonce', payload.nonce);
            this.checkout.submitOrder();
          }
        });
      }
    }
  }

}