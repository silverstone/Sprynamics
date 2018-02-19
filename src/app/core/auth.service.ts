import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import * as firebase from 'firebase/app';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore, AngularFirestoreDocument } from 'angularfire2/firestore';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/switchMap';

import { User } from './user.interface';

@Injectable()
export class AuthService {

  user: Observable<User>;

  constructor(private afAuth: AngularFireAuth,
              private afs: AngularFirestore,
              private router: Router) {

    // Get auth data, then get firestore user document || null
    this.user = this.afAuth.authState
      .switchMap(user => {
        if (user) {
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          return Observable.of(null);
        }
      });
  }

  emailSignUp(email: string, password: string) {
    return this.afAuth.auth.createUserWithEmailAndPassword(email, password)
      .then(user => {
        return this.emailLogin(email, password).then(_ => {
          return this.afs.doc(`users/${user.uid}`).set({
            uid: user.uid,
            email
          });
        });
      });
  }

  emailLogin(username: string, password: string) {
    return this.afAuth.auth.signInWithEmailAndPassword(username, password);
  }

  googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.afAuth.auth.signInWithPopup(provider)
      .then((credential) => {
        console.log(credential.user);
        this.updateUserData(credential.user, {
          uid: credential.user.uid,
          email: credential.user.email,
          firstName: credential.user.displayName.split(' ')[0],
          lastName: credential.user.displayName.split(' ')[1] || ''
        });
      });
  }

  facebookLogin() {
    const provider = new firebase.auth.FacebookAuthProvider();
    return this.afAuth.auth.signInWithPopup(provider)
      .then((credential) => {
        console.log(credential.user);
        this.updateUserData(credential.user, {
          uid: credential.user.uid,
          email: credential.user.email,
          firstName: credential.user.displayName.split(' ')[0],
          lastName: credential.user.displayName.split(' ')[1] || ''
        });
      });
  }

  // update properties on user document
  updateUserData(user: User, data: Partial<User>) {
    return this.afs.doc<User>(`users/${user.uid}`).update(data);
  }

  logout() {
    this.afAuth.auth.signOut();
  }

}
