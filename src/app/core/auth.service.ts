import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import * as firebase from 'firebase/app';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore, AngularFirestoreDocument } from 'angularfire2/firestore';

import { Observable } from 'rxjs';


import { User } from './user.interface';
import { FirestoreService } from '#core/firestore.service';

@Injectable()
export class AuthService {

  authState: Observable<firebase.User>;
  user: Observable<User>;

  constructor(
    private afAuth: AngularFireAuth,
    private afs: AngularFirestore,
    private firestore: FirestoreService,
    private router: Router
  ) {

    // Get auth data, then get firestore user document || null
    this.authState = this.afAuth.authState;
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
    console.log('ok')
    return this.afAuth.auth.createUserWithEmailAndPassword(email, password)
      .then(user => {
        console.log(user);
        return this.emailLogin(email, password).then(_ => {
          return this.afs.doc(`users/${user.uid}`).set({
            uid: user.uid,
            email
          });
        });
      })
      .catch(err => {
        console.log(err)
      })
  }

  emailLogin(username: string, password: string) {
    return this.afAuth.auth.signInWithEmailAndPassword(username, password);
  }

  googleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.afAuth.auth.signInWithPopup(provider)
      .then((credential) => {
        return this.updateUserData(credential.user, {
          uid: credential.user.uid,
          email: credential.user.email,
          firstName: credential.user.displayName.split(' ')[0],
          lastName: credential.user.displayName.split(' ')[1] || '',
        })
      });
  }

  facebookLogin() {
    const provider = new firebase.auth.FacebookAuthProvider();
    return this.afAuth.auth.signInWithPopup(provider)
      .then((credential) => {
        return this.updateUserData(credential.user, {
          uid: credential.user.uid,
          email: credential.user.email,
          firstName: credential.user.displayName.split(' ')[0],
          lastName: credential.user.displayName.split(' ')[1] || ''
        })
      });
  }

  anonLogin() {
    return this.afAuth.auth.signInAnonymously();
  }

  // update properties on user document
  updateUserData(user: User, data: Partial<User>) {
    return this.firestore.upsert<User>(`users/${user.uid}`, data);
  }

  logout() {
    this.afAuth.auth.signOut();
  }

  sendPasswordResetEmail(email: string) {
    return this.afAuth.auth.sendPasswordResetEmail(email);
  }

}
